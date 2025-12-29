from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from agents.agent_registry import AgentRegistry
from agents.agent_runner import AgentRunner
from baskets.basket_manager import AgentBasket
from communication.event_bus import EventBus
from database.mongo_db import MongoDBClient
from utils.redis_service import RedisService
from utils.logger import get_logger, get_execution_logger

logger = get_logger(__name__)
execution_logger = get_execution_logger()
import socketio
import os
import asyncio
import importlib
import json
import redis
from typing import Dict, Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
import uvicorn

load_dotenv()

# Get the directory where main.py is located
script_dir = Path(__file__).parent
agents_dir = script_dir / "agents"
config_file = script_dir / "agents_and_baskets.yaml"

registry = AgentRegistry(str(agents_dir))
registry.load_baskets(str(config_file))  # Load baskets from config
event_bus = EventBus()
mongo_client = MongoDBClient()
redis_service = RedisService()
sio = socketio.AsyncClient()

# Redis client setup
redis_client = None
try:
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", 6379))
    redis_client = redis.Redis(
        host=redis_host,
        port=redis_port,
        decode_responses=True,
        socket_timeout=5,
        socket_connect_timeout=5,
        retry_on_timeout=True
    )
    redis_client.ping()
    logger.info(f"Connected to Redis at {redis_host}:{redis_port}")
except (redis.ConnectionError, redis.RedisError) as e:
    logger.warning(f"Redis connection failed: {e}. Redis features will be disabled")
    redis_client = None

class AgentInput(BaseModel):
    agent_name: str = Field(..., description="Name of the agent to run")
    input_data: Dict = Field(..., description="Input data for the agent")
    stateful: bool = Field(False, description="Whether to run agent with state")

class BasketInput(BaseModel):
    basket_name: Optional[str] = Field(None, description="Name of predefined basket")
    config: Optional[Dict] = Field(None, description="Custom basket configuration")
    input_data: Optional[Dict] = Field(None, description="Input data for the basket execution")

async def connect_socketio():
    max_retries = 3
    for attempt in range(max_retries):
        try:
            socketio_url = os.getenv("SOCKETIO_URL", "http://localhost:5000")
            await sio.connect(socketio_url)
            logger.info("Socket.IO client connected")
            return True
        except Exception as e:
            logger.error(f"Socket.IO connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
    logger.error("Socket.IO connection failed after all retries")
    return False

async def forward_event_to_socketio(event_type: str, message: Dict):
    if sio.connected:
        try:
            await sio.emit(event_type, message)
            logger.debug(f"Forwarded event {event_type} to Socket.IO server")
        except Exception as e:
            logger.error(f"Failed to emit event {event_type}: {e}")
    else:
        logger.warning(f"Socket.IO not connected, could not forward event {event_type}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Disable Socket.IO connection for now
    socketio_connected = False
    # socketio_connected = await connect_socketio()
    if not socketio_connected:
        logger.info("Socket.IO disabled - continuing with core functionality")
        # We'll continue without Socket.IO instead of raising an error
    
    # Set up event forwarding only if Socket.IO is connected
    if socketio_connected:
        event_bus.subscribe('agent-recommendation', lambda msg: forward_event_to_socketio('agent-recommendation', msg))
        event_bus.subscribe('escalation', lambda msg: forward_event_to_socketio('escalation', msg))
        event_bus.subscribe('dependency-update', lambda msg: forward_event_to_socketio('dependency-update', msg))
        logger.info("Event forwarding setup complete")
    else:
        logger.warning("Event forwarding to Socket.IO disabled due to connection failure")
    
    yield
    if mongo_client:
        mongo_client.close()
    if sio.connected:
        await sio.disconnect()
    if redis_client:
        try:
            redis_client.close()
            logger.info("Closed Redis connection")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")
    logger.info("Disconnected from Socket.IO, MongoDB, and Redis")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://localhost:8080", "http://localhost:5000", "http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "services": {
            "mongodb": "connected" if mongo_client and mongo_client.db is not None else "disconnected",
            "socketio": "disabled",
            "redis": "connected" if redis_service.is_connected() else "disconnected"
        }
    }

    # Check legacy Redis client if it exists
    if redis_client:
        try:
            redis_client.ping()
            health_status["services"]["redis_legacy"] = "connected"
        except (redis.ConnectionError, redis.RedisError):
            health_status["services"]["redis_legacy"] = "disconnected"

    # Determine overall status
    connected_services = [status for status in health_status["services"].values() if status == "connected"]
    if len(connected_services) >= 2:  # MongoDB + Redis is sufficient
        health_status["status"] = "healthy"
    elif health_status["services"]["mongodb"] == "connected":
        health_status["status"] = "degraded"
    else:
        health_status["status"] = "unhealthy"

    return health_status

@app.get("/agents")
async def get_agents(domain: str = Query(None)):
    logger.debug(f"Fetching agents with domain: {domain}")
    try:
        if domain:
            return registry.get_agents_by_domain(domain)
        return list(registry.agents.values())
    except Exception as e:
        logger.error(f"Error fetching agents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch agents: {str(e)}")

@app.get("/baskets")
async def get_baskets():
    logger.debug("Fetching available baskets")
    try:
        # Get baskets from registry
        baskets_from_registry = registry.baskets

        # Also scan the baskets directory for JSON files
        baskets_dir = Path("baskets")
        file_baskets = []

        if baskets_dir.exists():
            for basket_file in baskets_dir.glob("*.json"):
                try:
                    with basket_file.open("r") as f:
                        basket_data = json.load(f)
                        basket_data["source"] = "file"
                        basket_data["filename"] = basket_file.name
                        file_baskets.append(basket_data)
                except Exception as e:
                    logger.warning(f"Failed to load basket file {basket_file}: {e}")

        # Combine both sources
        all_baskets = baskets_from_registry + file_baskets

        return {
            "baskets": all_baskets,
            "count": len(all_baskets)
        }
    except Exception as e:
        logger.error(f"Error fetching baskets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch baskets: {str(e)}")

@app.post("/run-agent")
async def run_agent(agent_input: AgentInput):
    logger.debug(f"Running agent: {agent_input.agent_name}")
    try:
        if not registry.validate_compatibility(agent_input.agent_name, agent_input.input_data):
            raise HTTPException(status_code=400, detail="Input data incompatible with agent")
        
        agent_spec = registry.get_agent(agent_input.agent_name)
        if not agent_spec:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        module_path = agent_spec.get("module_path", f"agents.{agent_input.agent_name}.{agent_input.agent_name}")
        try:
            agent_module = importlib.import_module(module_path)
        except ImportError as e:
            logger.error(f"Failed to import agent module {module_path}: {e}")
            raise HTTPException(status_code=500, detail=f"Agent module import failed: {str(e)}")
        
        runner = AgentRunner(agent_input.agent_name, stateful=agent_input.stateful)
        result = await runner.run(agent_module, agent_input.input_data)
        runner.close()
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        logger.error(f"Agent execution failed: {e}")
        mongo_client.store_log(agent_input.agent_name, f"Execution error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")

@app.post("/run-basket")
async def execute_basket(basket_input: BasketInput):
    """Execute a basket with enhanced logging and error handling"""
    logger.info(f"Executing basket: {basket_input}")

    try:
        # Load basket configuration
        if basket_input.basket_name:
            basket_path = Path("baskets") / f"{basket_input.basket_name}.json"
            if not basket_path.exists():
                raise HTTPException(status_code=404, detail=f"Basket {basket_input.basket_name} not found")
            with basket_path.open("r") as f:
                basket_spec = json.load(f)
        elif basket_input.config:
            basket_spec = basket_input.config
        else:
            raise HTTPException(status_code=400, detail="Must provide basket_name or config")

        # Validate basket specification
        if not basket_spec.get("agents"):
            raise HTTPException(status_code=400, detail="Basket must contain at least one agent")

        # Create and execute basket with Redis integration
        basket = AgentBasket(basket_spec, registry, event_bus, redis_service)

        # Execute with provided input data or agent-specific default
        if basket_input.input_data:
            input_data = basket_input.input_data
        else:
            # Get default input based on the first agent in the basket
            first_agent_name = basket_spec.get("agents", [])[0] if basket_spec.get("agents") else None
            if first_agent_name:
                agent_spec = registry.get_agent(first_agent_name)
                if agent_spec and "sample_input" in agent_spec:
                    input_data = agent_spec["sample_input"]
                    logger.info(f"Using sample input from {first_agent_name}: {input_data}")
                else:
                    input_data = {"input": "start"}
            else:
                input_data = {"input": "start"}

        logger.info(f"Starting basket execution: {basket_spec.get('basket_name', 'unnamed')} (ID: {basket.execution_id})")
        result = await basket.execute(input_data)

        # Add execution metadata to result
        if "error" not in result:
            result["execution_metadata"] = {
                "execution_id": basket.execution_id,
                "basket_name": basket_spec.get("basket_name", "unnamed"),
                "agents_executed": basket_spec.get("agents", []),
                "strategy": basket_spec.get("execution_strategy", "sequential")
            }

        logger.info(f"Basket execution completed: {basket.execution_id}")
        return result

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        error_msg = f"Basket execution failed: {str(e)}"
        logger.error(error_msg, exc_info=True)

        # Store error in Redis if service is available
        if redis_service.is_connected():
            try:
                redis_service.store_execution_log(
                    "unknown",
                    "basket_manager",
                    "execution_error",
                    {"error": error_msg, "basket_input": basket_input.model_dump()},
                    "error"
                )
            except Exception as redis_error:
                logger.warning(f"Failed to store error in Redis: {redis_error}")

        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/create-basket")
async def create_basket(basket_data: Dict):
    logger.debug(f"Creating basket: {basket_data}")
    try:
        basket_name = basket_data.get("name")
        if not basket_name:
            raise HTTPException(status_code=400, detail="Basket name is required")

        # Validate agents exist
        agents = basket_data.get("agents", [])
        for agent_name in agents:
            if not registry.get_agent(agent_name):
                raise HTTPException(status_code=400, detail=f"Agent {agent_name} not found")

        # Create basket configuration
        basket_config = {
            "basket_name": basket_name,
            "agents": agents,
            "execution_strategy": basket_data.get("execution_strategy", "sequential"),
            "description": basket_data.get("description", "")
        }

        # Save to file
        basket_path = Path("baskets") / f"{basket_name}.json"
        with basket_path.open("w") as f:
            json.dump(basket_config, f, indent=2)

        logger.info(f"Created basket: {basket_name}")
        return {"success": True, "message": f"Basket {basket_name} created successfully", "basket": basket_config}
    except Exception as e:
        logger.error(f"Basket creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Basket creation failed: {str(e)}")

@app.get("/logs")
async def get_logs(agent: str = Query(None)):
    logger.debug(f"Fetching logs for agent: {agent}")
    try:
        return {"logs": mongo_client.get_logs(agent)}
    except Exception as e:
        logger.error(f"Error fetching logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {str(e)}")

@app.get("/redis/status")
async def redis_status():
    """Check Redis connection and get statistics"""
    if not redis_service.is_connected():
        raise HTTPException(status_code=503, detail="Redis service not connected")

    try:
        stats = redis_service.get_stats()
        return {
            "status": "healthy" if stats["connected"] else "unhealthy",
            "message": "Redis service is working correctly",
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Redis status check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Redis status check failed: {str(e)}")

@app.get("/execution-logs/{execution_id}")
async def get_execution_logs(execution_id: str, limit: int = Query(100, ge=1, le=1000)):
    """Get execution logs for a specific execution ID"""
    try:
        logs = redis_service.get_execution_logs(execution_id, limit)
        return {
            "execution_id": execution_id,
            "logs": logs,
            "count": len(logs)
        }
    except Exception as e:
        logger.error(f"Failed to get execution logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get execution logs: {str(e)}")

@app.get("/agent-logs/{agent_name}")
async def get_agent_logs(agent_name: str, limit: int = Query(100, ge=1, le=1000)):
    """Get logs for a specific agent"""
    try:
        logs = redis_service.get_agent_logs(agent_name, limit)
        return {
            "agent_name": agent_name,
            "logs": logs,
            "count": len(logs)
        }
    except Exception as e:
        logger.error(f"Failed to get agent logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get agent logs: {str(e)}")

@app.post("/redis/cleanup")
async def cleanup_redis_data(days: int = Query(7, ge=1, le=30)):
    """Clean up old Redis data"""
    try:
        redis_service.cleanup_old_data(days)
        return {
            "success": True,
            "message": f"Cleaned up Redis data older than {days} days"
        }
    except Exception as e:
        logger.error(f"Redis cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Redis cleanup failed: {str(e)}")

@app.delete("/baskets/{basket_name}")
async def delete_basket(basket_name: str):
    """Delete a basket and clean up all related data"""
    logger.info(f"Deleting basket: {basket_name}")

    try:
        # Check if basket exists
        basket_path = Path("baskets") / f"{basket_name}.json"
        if not basket_path.exists():
            raise HTTPException(status_code=404, detail=f"Basket '{basket_name}' not found")

        # Load basket configuration to get execution history
        with basket_path.open("r") as f:
            basket_config = json.load(f)

        cleanup_summary = {
            "basket_name": basket_name,
            "files_deleted": [],
            "redis_data_cleaned": [],
            "mongo_data_cleaned": [],
            "errors": []
        }

        # 1. Clean up Redis data
        if redis_service.is_connected():
            try:
                # Get all execution IDs for this basket
                execution_ids = redis_service.get_basket_executions(basket_name)

                for execution_id in execution_ids:
                    # Clean execution logs
                    redis_service.client.delete(f"execution:{execution_id}:logs")

                    # Clean agent outputs for this execution
                    for agent_name in basket_config.get("agents", []):
                        redis_service.client.delete(f"execution:{execution_id}:outputs:{agent_name}")
                        redis_service.client.delete(f"agent:{agent_name}:state:{execution_id}")

                    cleanup_summary["redis_data_cleaned"].append(f"execution:{execution_id}")

                # Clean basket metadata
                redis_service.client.delete(f"basket:{basket_name}:executions")

                # Clean basket execution metadata
                basket_keys = redis_service.client.keys(f"basket:{basket_name}:execution:*")
                if basket_keys:
                    redis_service.client.delete(*basket_keys)
                    cleanup_summary["redis_data_cleaned"].extend([key.decode() for key in basket_keys])

                logger.info(f"Cleaned Redis data for basket: {basket_name}")

            except Exception as e:
                error_msg = f"Redis cleanup error: {str(e)}"
                cleanup_summary["errors"].append(error_msg)
                logger.error(error_msg)

        # 2. Clean up MongoDB data (if connected)
        if mongo_client and mongo_client.db is not None:
            try:
                # Clean basket execution logs from MongoDB
                result = mongo_client.db.logs.delete_many({"basket_name": basket_name})
                if result.deleted_count > 0:
                    cleanup_summary["mongo_data_cleaned"].append(f"Deleted {result.deleted_count} log entries")

                # Clean basket metadata from MongoDB
                result = mongo_client.db.baskets.delete_many({"basket_name": basket_name})
                if result.deleted_count > 0:
                    cleanup_summary["mongo_data_cleaned"].append(f"Deleted {result.deleted_count} basket records")

                logger.info(f"Cleaned MongoDB data for basket: {basket_name}")

            except Exception as e:
                error_msg = f"MongoDB cleanup error: {str(e)}"
                cleanup_summary["errors"].append(error_msg)
                logger.error(error_msg)

        # 3. Clean up log files
        try:
            logs_dir = Path("logs/basket_runs")
            if logs_dir.exists():
                # Find and delete log files for this basket
                log_files = list(logs_dir.glob(f"{basket_name}_*.log"))
                for log_file in log_files:
                    log_file.unlink()
                    cleanup_summary["files_deleted"].append(str(log_file))

                logger.info(f"Deleted {len(log_files)} log files for basket: {basket_name}")

        except Exception as e:
            error_msg = f"Log file cleanup error: {str(e)}"
            cleanup_summary["errors"].append(error_msg)
            logger.error(error_msg)

        # 4. Delete the basket configuration file
        try:
            basket_path.unlink()
            cleanup_summary["files_deleted"].append(str(basket_path))
            logger.info(f"Deleted basket configuration file: {basket_path}")

        except Exception as e:
            error_msg = f"Basket file deletion error: {str(e)}"
            cleanup_summary["errors"].append(error_msg)
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

        # 5. Reload registry to remove basket from memory
        try:
            config_file = Path("agents_and_baskets.yaml")
            if config_file.exists():
                registry.load_baskets(str(config_file))
            logger.info("Reloaded basket registry")

        except Exception as e:
            error_msg = f"Registry reload error: {str(e)}"
            cleanup_summary["errors"].append(error_msg)
            logger.warning(error_msg)

        # 6. Log the deletion event in Redis (if available)
        if redis_service.is_connected():
            try:
                deletion_log = {
                    "event": "basket_deleted",
                    "basket_name": basket_name,
                    "timestamp": datetime.now().isoformat(),
                    "cleanup_summary": cleanup_summary
                }
                redis_service.client.lpush("system:basket_deletions", json.dumps(deletion_log))
                redis_service.client.expire("system:basket_deletions", 86400 * 30)  # Keep for 30 days

            except Exception as e:
                logger.warning(f"Failed to log deletion event: {e}")

        # Prepare response
        success_message = f"Basket '{basket_name}' deleted successfully"
        if cleanup_summary["errors"]:
            success_message += f" with {len(cleanup_summary['errors'])} warnings"

        logger.info(f"Basket deletion completed: {basket_name}")

        return {
            "success": True,
            "message": success_message,
            "cleanup_summary": cleanup_summary
        }

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        error_msg = f"Failed to delete basket '{basket_name}': {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise HTTPException(status_code=500, detail=error_msg)

# Law Agent Request Models
class BasicLegalQueryRequest(BaseModel):
    user_input: str
    feedback: Optional[str] = None
    session_id: Optional[str] = None

class AdaptiveLegalQueryRequest(BaseModel):
    user_input: str
    enable_learning: bool = True
    feedback: Optional[str] = None
    session_id: Optional[str] = None

class EnhancedLegalQueryRequest(BaseModel):
    user_input: str
    location: Optional[str] = None
    feedback: Optional[str] = None
    session_id: Optional[str] = None

# Law Agent Endpoints
@app.post("/basic-query")
async def process_basic_query(request: BasicLegalQueryRequest):
    """Process a legal query using the basic agent"""
    try:
        # Use the existing run-agent endpoint internally
        agent_input = AgentInput(
            agent_name="law_agent",
            input_data={
                "query": request.user_input,
                "agent_type": "basic",
                "feedback": request.feedback
            },
            stateful=False
        )
        return await run_agent(agent_input)
    except Exception as e:
        logger.error(f"Basic query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/adaptive-query")
async def process_adaptive_query(request: AdaptiveLegalQueryRequest):
    """Process a legal query using the adaptive agent"""
    try:
        agent_input = AgentInput(
            agent_name="law_agent",
            input_data={
                "query": request.user_input,
                "agent_type": "adaptive",
                "feedback": request.feedback
            },
            stateful=False
        )
        return await run_agent(agent_input)
    except Exception as e:
        logger.error(f"Adaptive query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/enhanced-query")
async def process_enhanced_query(request: EnhancedLegalQueryRequest):
    """Process a legal query using the enhanced agent"""
    try:
        agent_input = AgentInput(
            agent_name="law_agent",
            input_data={
                "query": request.user_input,
                "agent_type": "enhanced",
                "location": request.location,
                "feedback": request.feedback
            },
            stateful=False
        )
        return await run_agent(agent_input)
    except Exception as e:
        logger.error(f"Enhanced query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("FASTAPI_PORT", 8000))
    host = os.getenv("FASTAPI_HOST", "0.0.0.0")  # Bind to all interfaces
    uvicorn.run(app, host=host, port=port)

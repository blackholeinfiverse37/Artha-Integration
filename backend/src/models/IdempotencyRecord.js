// backend/src/models/IdempotencyRecord.js
// Enhanced Idempotency Record Schema

import mongoose from 'mongoose';

const Schema = mongoose.Schema;

/**
 * IdempotencyRecord Schema
 * Stores results of write operations to prevent duplicates
 */
const idempotencyRecordSchema = new Schema(
  {
    // User who made the request
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Idempotency key provided by client
    idempotencyKey: {
      type: String,
      required: true,
      index: true,
    },

    // HTTP method
    method: {
      type: String,
      enum: ['POST', 'PUT', 'DELETE', 'PATCH'],
      required: true,
    },

    // API endpoint path
    path: {
      type: String,
      required: true,
    },

    // Response status code
    statusCode: {
      type: Number,
      required: true,
    },

    // Complete response data
    response: {
      type: Schema.Types.Mixed,
      required: true,
    },

    // When request was first processed
    createdAt: {
      type: Date,
      default: Date.now,
    },

    // When record expires and can be deleted
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 }, // TTL index
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Create compound index for unique idempotency per user
 */
idempotencyRecordSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    name: 'user_idempotency_key_unique',
  }
);

/**
 * Create index for efficient cleanup
 */
idempotencyRecordSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    name: 'idempotency_ttl_index',
  }
);

/**
 * Create index for finding user's records
 */
idempotencyRecordSchema.index(
  { userId: 1, createdAt: -1 },
  {
    name: 'user_created_at_index',
  }
);

/**
 * Instance method: Check if record is valid (not expired)
 */
idempotencyRecordSchema.methods.isValid = function () {
  return new Date() <= new Date(this.expiresAt);
};

/**
 * Instance method: Get response data
 */
idempotencyRecordSchema.methods.getResponse = function () {
  return {
    statusCode: this.statusCode,
    response: this.response,
  };
};

/**
 * Static method: Find valid record for request
 */
idempotencyRecordSchema.statics.findValidRecord = async function (
  userId,
  idempotencyKey,
  method,
  path
) {
  const record = await this.findOne({
    userId,
    idempotencyKey,
    method,
    path,
  });

  if (record && record.isValid()) {
    return record;
  }

  return null;
};

/**
 * Static method: Store new request result
 */
idempotencyRecordSchema.statics.storeResult = async function (
  userId,
  idempotencyKey,
  method,
  path,
  statusCode,
  response
) {
  return await this.findOneAndUpdate(
    {
      userId,
      idempotencyKey,
      method,
      path,
    },
    {
      userId,
      idempotencyKey,
      method,
      path,
      statusCode,
      response,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    { upsert: true, new: true }
  );
};

/**
 * Static method: Cleanup expired records
 */
idempotencyRecordSchema.statics.cleanupExpired = async function () {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
  return result;
};

export default mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
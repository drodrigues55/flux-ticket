import { prisma } from '@flux/database';
import { createRedisConnection } from './redis';
import { logger } from './logger';
import { BatchProgressionRule } from '@prisma/client';

const redis = createRedisConnection();

export class BatchProgressionService {
  /**
   * Main cron entrypoint.
   * Scans all ACTIVE batches that have progression rules.
   */
  async processBatchTransitions() {
    const activeBatches = await prisma.ticketBatch.findMany({
      where: {
        status: 'ACTIVE',
        progressionRule: { not: 'MANUAL' },
      },
    });

    for (const batch of activeBatches) {
      await this.checkAndTransitionBatch(batch);
    }
  }

  private async checkAndTransitionBatch(batch: any) {
    const lockKey = `lock:batch_progression:${batch.id}`;
    
    // Acquire distributed lock for 30 seconds
    const acquired = await redis.set(lockKey, 'locked', 'EX', 30, 'NX');
    if (!acquired) {
      // Another worker is already checking this batch
      return;
    }

    try {
      // Re-fetch inside lock to ensure we still have an ACTIVE batch
      const currentBatch = await prisma.ticketBatch.findUnique({
        where: { id: batch.id },
      });

      if (!currentBatch || currentBatch.status !== 'ACTIVE') {
        return;
      }

      const shouldTransition = this.evaluateProgressionRule(currentBatch);

      if (shouldTransition) {
        logger.info({ batchId: batch.id, rule: currentBatch.progressionRule }, 'Batch met progression rule. Transitioning...');
        await this.executeTransition(currentBatch);
      }
    } catch (error) {
      logger.error({ err: error, batchId: batch.id }, 'Error processing batch progression');
    } finally {
      // Release lock
      await redis.del(lockKey);
    }
  }

  private evaluateProgressionRule(batch: any): boolean {
    const now = new Date();
    const soldQuantity = batch.totalQuantity - batch.availableQuantity;

    const meetsQuantity =
      batch.progressionQuantityThreshold != null &&
      soldQuantity >= batch.progressionQuantityThreshold;

    const meetsDate =
      batch.progressionDateThreshold != null &&
      now >= new Date(batch.progressionDateThreshold);

    switch (batch.progressionRule) {
      case BatchProgressionRule.QUANTITY:
        return meetsQuantity;
      case BatchProgressionRule.DATE:
        return meetsDate;
      case BatchProgressionRule.BOTH:
        // Transition if EITHER condition is met
        return meetsQuantity || meetsDate;
      default:
        return false;
    }
  }

  private async executeTransition(batch: any) {
    await prisma.$transaction(async (tx) => {
      // 1. Close the current batch
      await tx.ticketBatch.update({
        where: { id: batch.id },
        data: { status: 'COMPLETED' },
      });

      await tx.auditLog.create({
        data: {
          actorRole: 'SYSTEM',
          action: 'BATCH_AUTO_CLOSED',
          entityType: 'TicketBatch',
          entityId: batch.id,
          reason: 'PROGRESSION_RULE_MET',
          after: { status: 'COMPLETED' },
        },
      });

      // 2. Activate the next batch if it exists
      if (batch.nextBatchId) {
        const nextBatch = await tx.ticketBatch.findUnique({
          where: { id: batch.nextBatchId },
        });

        if (nextBatch && nextBatch.status === 'DRAFT') {
          await tx.ticketBatch.update({
            where: { id: batch.nextBatchId },
            data: { status: 'ACTIVE' },
          });

          await tx.auditLog.create({
            data: {
              actorRole: 'SYSTEM',
              action: 'BATCH_AUTO_ACTIVATED',
              entityType: 'TicketBatch',
              entityId: nextBatch.id,
              reason: 'PROGRESSION_FROM_PREVIOUS',
              before: { status: 'DRAFT' },
              after: { status: 'ACTIVE' },
              metadata: { previousBatchId: batch.id },
            },
          });
        }
      }
    });
  }
}

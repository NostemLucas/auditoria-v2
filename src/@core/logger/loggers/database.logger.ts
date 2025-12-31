import { Injectable } from '@nestjs/common'
import { BaseLogger } from './base.logger'
import { DatabaseLogContext, UserContext, LogLevel } from '../types'

interface PrismaError {
  code?: string
  message: string
  meta?: Record<string, unknown>
  clientVersion?: string
}

@Injectable()
export class DatabaseLogger extends BaseLogger {
  constructor() {
    super('database')
  }

  logQuery(query: string, duration: number, user?: UserContext): void {
    const context: DatabaseLogContext = {
      user,
      database: {
        operation: 'QUERY',
        errorMessage: '', // No es error, solo query
      },
      query,
      additionalData: {
        duration: `${duration}ms`,
      },
    }

    this.log(LogLevel.DEBUG, `Database Query Executed (${duration}ms)`, context)
  }

  logError(
    error: PrismaError,
    operation: string,
    user?: UserContext,
    query?: string,
  ): void {
    const context: DatabaseLogContext = {
      user,
      database: {
        operation,
        errorCode: error.code,
        errorMessage: error.message,
        meta: error.meta,
      },
      query,
      additionalData: {
        clientVersion: error.clientVersion,
      },
    }

    this.log(
      LogLevel.ERROR,
      `Database Error: ${operation} - ${error.message}`,
      context,
    )
  }

  logConnection(event: 'connect' | 'disconnect', database?: string): void {
    const context: DatabaseLogContext = {
      database: {
        operation: event.toUpperCase(),
        errorMessage: '',
      },
      additionalData: {
        database,
        timestamp: new Date().toISOString(),
      },
    }

    const message =
      event === 'connect'
        ? `Database Connected${database ? ` to ${database}` : ''}`
        : `Database Disconnected${database ? ` from ${database}` : ''}`

    this.log(LogLevel.INFO, message, context)
  }

  logSlowQuery(
    query: string,
    duration: number,
    threshold: number,
    user?: UserContext,
  ): void {
    const context: DatabaseLogContext = {
      user,
      database: {
        operation: 'SLOW_QUERY',
        errorMessage: '',
      },
      query,
      additionalData: {
        duration: `${duration}ms`,
        threshold: `${threshold}ms`,
        exceeded: `${duration - threshold}ms`,
      },
    }

    this.log(
      LogLevel.WARN,
      `Slow Query Detected: ${duration}ms (threshold: ${threshold}ms)`,
      context,
    )
  }
}

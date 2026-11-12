# @peerfall/core

What every Peerfall package shares: the app's event bus, the `ServiceResponse` contract and its
error handler, the browser storage keys, and validation helpers.

> **Note:** core depends on nothing in the repo. The app uses `configureCore()`, `/types`, `/utils`
> and `/hooks`. `/services` (the event bus, the error handler) is for packages only.

## Structure

```
src/
├── config.ts                          → configureCore({ logEvents, logLevel, logSink }), getCoreConfig, resetCoreConfig
├── hooks/
│   └── events/useEventListener.hook.ts → subscribe to the bus for a component's lifetime
├── services/
│   ├── errors/error-handler.service.ts → handleServiceError (fallbackCode, override), errorResponse, extractError
│   └── events/
│       ├── event-bus.service.ts        → EventBus + the shared eventBus (wildcards, once, middleware, history, replay)
│       └── event-logging.service.ts    → createLoggingMiddleware
├── types/definitions/
│   ├── config.ts                       → CoreConfig
│   ├── logger.ts                       → LogLevel, LogThreshold, LogSink
│   ├── error.ts, response.ts           → ErrorCode, AppError, ServiceResponse
│   ├── event.ts                        → Event, EventListener, EventMiddleware, EventPattern, IEventBus
│   ├── storage.ts                      → StorageAdapter, STORAGE_KEYS
│   ├── stream.ts                       → Stamped, EventStamp: events numbered in stream order
│   └── validation.ts                   → Validated, NonEmptyList, StringRule
├── test/                               → recordLogs (not exported)
├── utils/
│   ├── logging/                        → logger: the only code that touches the console
│   ├── text/                           → utf8Encode
│   └── validation/                     → ObjectReader, Issues, reportDuplicates, isRecord, describeType, joinPath
└── index.ts                            → configureCore
```

## Key Features

- **One event bus:** packages emit `X_EVENTS.NAME` with `{ source }` metadata and listeners get the
  whole event. A listener or middleware that throws or rejects is reported and skipped; the rest still run.
- **Errors are values:** services return `ServiceResponse<T>`. `handleServiceError` wraps a thrown
  value, with a `fallbackCode` for plain `Error`s; `errorResponse` builds an expected failure.
- **One logger:** packages and the app log through `logger` from `/utils`, never `console`. It is
  silent in tests, writes from `debug` in development and from `warn` in a release; `logLevel`
  and `logSink` change that.
- **Event log:** `configureCore({ logEvents: {} })` logs every event at `debug` while debugging.

## Dependencies

- `react` (peer): only for `useEventListener`

# Application Architecture

The app follows a layered architecture. New code should depend inward and keep framework details at the edge.

## Layers

- `app/`: presentation and navigation. Screens render state and dispatch application actions; they do not read AsyncStorage directly.
- `store/`: application state and orchestration. Zustand actions coordinate state transitions and call repositories/services.
- `services/`: data and infrastructure boundaries. API clients, repositories, native modules, storage, and cache adapters live here.
- `constants/` and `types/`: domain-facing data and contracts. Keep these independent from Expo, React, and Zustand where practical.
- `components/`: reusable presentation components without persistence or routing policy.

## Dependency Rules

1. Screens may depend on stores, domain types, and services intended for presentation use.
2. Stores may depend on domain types and repositories/services, but never on React components or router navigation.
3. Repositories and API services may depend on infrastructure adapters such as `services/storage.ts`.
4. `services/storage.ts` is the only shared boundary for JSON persistence and TTL cache access.
5. Routing decisions stay in Expo Router layouts/screens; persistence actions must not import `router`.

## Current Boundaries

- `services/storage.ts` owns AsyncStorage access, JSON serialization, and cache expiry.
- `services/api.ts` and `services/nasjakApi.ts` own all access to nasjak-backend (session token, errors, uploads).
- `services/quranApi.ts` and `services/hadisApi.ts` own remote API access and use the shared cache boundary.
- `store/appStore.ts` owns application state transitions and delegates persistence to repositories.

When changing a feature, extract its persistence or remote data access into a service/repository before adding more logic to a screen or the global store.

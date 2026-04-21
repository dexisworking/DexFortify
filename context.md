# DexFortify — Migration Context & Handover

## Project Overview
DexFortify is an interactive network security simulator. It was migrated from the `iamdex` monorepo to this standalone repository.

## Architecture
- **State**: Managed via Zustand in `src/store/useNetworkStore.ts`. Handles topology, packets, scores, and logs.
- **Simulation Engine**: Logic resides in `src/lib/engine.ts`, `src/lib/gamify.ts`, and driven by the `usePacketEngine` hook in `src/hooks/usePacketEngine.ts`.
- **UI Components**:
  - `TopologyCanvas.tsx`: The ReactFlow-based network visualizer.
  - `FortifyClient.tsx`: The main orchestration component for the simulator UI.
  - `FortifyInstructionsPanel.tsx`: Onboarding and tutorial logic.
- **Styling**: Uses Tailwind CSS with a custom design system defined in `src/app/layout.tsx` (CSS variables).

## Refactoring Notes
1. **Flat Structure**: All components were moved from `src/components/dexfortify/` to `src/components/`.
2. **Import Flattening**: Imports were updated from `@/lib/dexfortify/...` to `@/lib/...` and standard `@/components/...` paths.
3. **Decoupling**: Portfolio-specific navigation and shared monorepo components were removed to ensure standalone functionality.

## Known Dependencies
- `reactflow`: Core visualization library.
- `framer-motion`: Used for packet animations and UI transitions.
- `zustand`: State management.
- `lucide-react`: Iconography.

## Next Steps for the Next Agent
1. **Verification**: Run `npm install` and `npm run dev` to verify the build.
2. **Visual Polish**: Ensure CSS variables from the original project are perfectly mapped in `layout.tsx` and `globals.css`.
3. **Level Expansion**: The `src/lib/levels.ts` file contains the scenario definitions. Adding new levels involves defining new node/edge configurations there.
4. **Export Logic**: The "Get Report" button is currently a placeholder link. Implementing a PDF or JSON export of the mission results would be a great next feature.

---
Migrated on 2026-04-21.

"use strict";
// All Do* discriminated-union types live here so that card.ts (Layer 2) can
// reference `Do` without depending on any runtime operation code.
// This file must NOT import from operations/, game.ts, state.ts, or card.ts.
Object.defineProperty(exports, "__esModule", { value: true });

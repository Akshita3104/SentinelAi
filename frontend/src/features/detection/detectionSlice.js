import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'idle',
  error: null,
  attacks: [],
  stats: {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  },
  attackTypes: {},
  recentAttacks: [],
  detectionRules: [],
};

const detectionSlice = createSlice({
  name: 'detection',
  initialState,
  reducers: {
    fetchAttacksStart(state) {
      state.status = 'loading';
    },
    fetchAttacksSuccess(state, action) {
      state.status = 'succeeded';
      state.attacks = action.payload.attacks;
      state.stats = action.payload.stats;
      state.attackTypes = action.payload.attackTypes;
      state.recentAttacks = action.payload.recentAttacks;
    },
    fetchAttacksFailure(state, action) {
      state.status = 'failed';
      state.error = action.payload;
    },
    addDetectedAttack(state, action) {
      const attack = action.payload;
      state.recentAttacks = [attack, ...state.recentAttacks].slice(0, 50);
      
      // Update attack type count
      state.attackTypes[attack.type] = (state.attackTypes[attack.type] || 0) + 1;
      
      // Update severity stats
      state.stats.total += 1;
      if (attack.severity === 'critical') state.stats.critical += 1;
      else if (attack.severity === 'high') state.stats.high += 1;
      else if (attack.severity === 'medium') state.stats.medium += 1;
      else state.stats.low += 1;
    },
    updateDetectionRules(state, action) {
      state.detectionRules = action.payload;
    },
  },
});

export const {
  fetchAttacksStart,
  fetchAttacksSuccess,
  fetchAttacksFailure,
  addDetectedAttack,
  updateDetectionRules,
} = detectionSlice.actions;

export default detectionSlice.reducer;

// Selectors
export const selectDetectionStatus = (state) => state.detection.status;
export const selectAttackStats = (state) => state.detection.stats;
export const selectAttackTypes = (state) => state.detection.attackTypes;
export const selectRecentAttacks = (state) => state.detection.recentAttacks;
export const selectDetectionRules = (state) => state.detection.detectionRules;

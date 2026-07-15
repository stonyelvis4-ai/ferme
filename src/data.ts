/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FarmSettings } from './types';

export const initialSettings: FarmSettings = {
  name: 'FERM+',
  logoUrl: '',
  location: '',
  managerName: '',
  contactEmail: '',
  contactPhone: '',
  currency: 'FCFA',
  areaUnit: 'ha',
  weightUnit: 'kg',
  alarmSoundEnabled: true,
  alarmLoopEnabled: true,
  alarmForWarnings: true,
  alarmForCriticals: true,
  alarmVolume: 100,
  alarmSoundKey: 'ferm-plus-default'
};

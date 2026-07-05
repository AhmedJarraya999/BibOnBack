export const VolunteerPermission = {
  CHECK_IN: 'CHECK_IN',
  FINISH: 'FINISH',
  DISQUALIFY: 'DISQUALIFY',
  DISTRIBUTE: 'DISTRIBUTE',
  REGISTRATION: 'REGISTRATION',
  BIB_DISTRIBUTION: 'BIB_DISTRIBUTION',
  RAVITO: 'RAVITO',
  MEDAL: 'MEDAL',
  MEDICAL: 'MEDICAL',
  GAMES: 'GAMES',
} as const;

export type VolunteerPermission = (typeof VolunteerPermission)[keyof typeof VolunteerPermission];

export const VolunteerPermission = {
  CHECK_IN: 'CHECK_IN',
  FINISH: 'FINISH',
  DISQUALIFY: 'DISQUALIFY',
  DISTRIBUTE: 'DISTRIBUTE',
} as const;

export type VolunteerPermission = (typeof VolunteerPermission)[keyof typeof VolunteerPermission];

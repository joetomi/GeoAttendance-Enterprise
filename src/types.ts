/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Employee {
  id: string;
  name: string;
  username: string;
  role: string;
  email: string;
  department: string;
  status: 'Active' | 'Inactive';
  avatar?: string;
}

export interface Geofence {
  latitude: number;
  longitude: number;
  radius: number;
  name: string;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  timestamp: string;
  status: 'In' | 'Out';
}

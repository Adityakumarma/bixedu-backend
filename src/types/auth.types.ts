import { UserRole } from "../constants/roles";

export interface JwtPayload {
  userId: string;
  role: UserRole;
  centreId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  centreId?: string;
}

import { IUser } from "../modules/auth/user.model";

export interface IdParams {
  id: string;
}


declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export {};
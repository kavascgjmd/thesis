import { Request } from 'express';

export interface SignupRequest extends Request {
    body: {
        username: string;
        password: string;
        email: string;
        phone: string;
        role: 'Admin' | 'Donor' | 'NGO' | 'Recipient';
    }
}

export interface OtpVerifyRequest extends Request {
    body: {
        phone: string;
        otp: string;
    }
}

export interface UserPayload {
  id: number;
  role: string;
  // any other user properties you have
}

export interface DriverPayload {
  id: number;
  role: 'driver';
}

// glpk.d.ts - Updated for version 4.0.2
declare module 'glpk.js' {
  interface Options {
    msglev?: number;
    presol?: boolean;
    tmlim?: number;
    [key: string]: any;
  }

  // Match the exact structure expected by GLPK v4.0.2
  interface LP {
    name: string;
    objective: {
      direction: number;
      name: string;
      vars: Array<{ name: string; coef: number }>;
    };
    subjectTo: Array<{
      name: string;
      vars: Array<{ name: string; coef: number }>;
      bnds: { type: number; ub: number; lb: number }; // Both ub and lb are required!
    }>;
    generals?: string[];
    binaries?: string[];
  }

  interface Result {
    status: number;
    z: number;
    vars: Record<string, number>;
    dual?: Record<string, number>;
  }

  interface GLPK {
    // This version doesn't have a .create() method
    // Instead, we create the problem structure directly as an object
    
    // Solver function
    solve(lp: LP, options?: Options): Promise<Result>;
    
    // Constants
    MAX: number;
    MIN: number;
    FR: number;
    LO: number;
    UP: number;
    DB: number;
    FX: number;
    CV: number;
    IV: number;
    BV: number;
    MSG_OFF: number;
    MSG_ERR: number;
    MSG_ON: number;
    MSG_ALL: number;
    MSG_DBG: number;
    UNDEF: number;
    FEAS: number;
    INFEAS: number;
    NOFEAS: number;
    OPT: number;
    UNBND: number;
  }

  export default function(): Promise<GLPK>;
}



// Extend Express Request type to include driver
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      driver?: DriverPayload;
    }
  }
}
  
  

declare module 'javascript-lp-solver' {
  // Generic index signature for all objects
  interface IndexableObject {
    [key: string]: any;
  }

  interface SolverModel extends IndexableObject {
    optimize: string;
    opType: "min" | "max";
    constraints: IndexableObject;
    variables: IndexableObject;
    binaries?: IndexableObject;
    ints?: IndexableObject;
    unrestricted?: IndexableObject;
  }

  interface SolverSolution extends IndexableObject {
    feasible: boolean;
    result?: number;
    bounded?: boolean;
    isIntegral?: boolean;
  }

  // Export all the specific types that might be used in dynamic imports
  export const Model: any;
  export const Variable: any;
  export const Constraint: any;
  export const Expression: any;
  export const Solution: any;
  
  // Direct exports of functions
  export function Solve(model: SolverModel): SolverSolution;
  export function MultiObjective(model: SolverModel): SolverSolution;
  
  // Default export for CommonJS require syntax
  namespace Solver {
    export function Solve(model: SolverModel): SolverSolution;
    export function MultiObjective(model: SolverModel): SolverSolution;
  }
  
  export default Solver;
}
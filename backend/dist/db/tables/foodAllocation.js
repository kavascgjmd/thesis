"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFoodAllocationTable = createFoodAllocationTable;
const util_1 = require("../util");
function createFoodAllocationTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createFoodAllocationTableQuery = `
       CREATE TABLE IF NOT EXISTS food_allocations (
  id SERIAL PRIMARY KEY,
  food_donation_id INTEGER REFERENCES food_donations(id),
  ngo_id INTEGER REFERENCES ngos(id),
  allocated_quantity DECIMAL(10,2),
  allocated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted BOOLEAN DEFAULT FALSE,
  pickup_scheduled BOOLEAN DEFAULT FALSE,
  pickup_completed BOOLEAN DEFAULT FALSE,
  allocation_status VARCHAR(50) DEFAULT 'PENDING'
);
    `;
        yield (0, util_1.query)(createFoodAllocationTableQuery);
    });
}

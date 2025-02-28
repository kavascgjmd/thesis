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
exports.createDeliveryRoutesTable = createDeliveryRoutesTable;
const util_1 = require("../util");
function createDeliveryRoutesTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createDeliveryRoutesTableQuery = `
        CREATE TABLE IF NOT EXISTS delivery_routes (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id),
            total_distance DECIMAL(10, 2),
            estimated_duration INTEGER, -- in minutes
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
        yield (0, util_1.query)(createDeliveryRoutesTableQuery);
    });
}

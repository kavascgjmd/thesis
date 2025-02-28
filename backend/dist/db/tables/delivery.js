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
exports.createDeliveryTable = createDeliveryTable;
const util_1 = require("../util");
function createDeliveryTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createDeliveryTableQuery = `
          CREATE TABLE IF NOT EXISTS deliveries (
            id SERIAL PRIMARY KEY,
            request_id INTEGER REFERENCES orders(id),
            driver_id INTEGER REFERENCES drivers(id),
            delivery_status VARCHAR(50),
            pickup_time TIMESTAMP WITH TIME ZONE,
            estimated_delivery_time TIMESTAMP WITH TIME ZONE,
            actual_delivery_time TIMESTAMP WITH TIME ZONE,
            delivery_time TIMESTAMP WITH TIME ZONE,
            gps_location VARCHAR(255),
            delivery_confirmation VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
        yield (0, util_1.query)(createDeliveryTableQuery);
    });
}

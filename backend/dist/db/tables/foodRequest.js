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
exports.createFoodRequestTable = createFoodRequestTable;
const util_1 = require("../util");
function createFoodRequestTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createFoodRequestTableQuery = `
        CREATE TABLE IF NOT EXISTS food_requests (
            id SERIAL PRIMARY KEY,
            ngo_id INTEGER REFERENCES ngos(id),
            donation_id INTEGER REFERENCES food_donations(id),
            request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            request_status VARCHAR(50)
        );
    `;
        yield (0, util_1.query)(createFoodRequestTableQuery);
    });
}

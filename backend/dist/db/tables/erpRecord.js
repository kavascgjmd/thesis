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
exports.createERPRecordTable = createERPRecordTable;
const util_1 = require("../util");
function createERPRecordTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createERPRecordTableQuery = `
        CREATE TABLE IF NOT EXISTS erp_records (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            operation_type VARCHAR(50),
            operation_date TIMESTAMP WITH TIME ZONE,
            resource_details TEXT,
            notes TEXT
        );
    `;
        yield (0, util_1.query)(createERPRecordTableQuery);
    });
}

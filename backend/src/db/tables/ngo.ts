import { query } from '../util';
export async function createNGOTable() {
    const createNGOTableQuery = `
CREATE TABLE IF NOT EXISTS ngos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    ngo_name VARCHAR(255),
    mission_statement TEXT,
    contact_person VARCHAR(255),
    contact_number VARCHAR(50),
    operating_hours VARCHAR(255),
    target_demographics TEXT,
    ngo_type VARCHAR(50),
    registration_number VARCHAR(100),
    registration_certificate TEXT,
    registration_certificate_url VARCHAR(255),
    registration_certificate_storage VARCHAR(50),
    pan_number VARCHAR(20),
    pan_card_image TEXT,
    pan_card_image_url VARCHAR(255),
    pan_card_image_storage VARCHAR(50),
    fcra_number VARCHAR(100),
    fcra_certificate TEXT,
    fcra_certificate_url VARCHAR(255),
    fcra_certificate_storage VARCHAR(50),
    tax_exemption_certificate TEXT,
    tax_exemption_certificate_url VARCHAR(255),
    tax_exemption_certificate_storage VARCHAR(50),
    annual_reports_link VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    can_place_orders BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

    `;
    try {
        await query(createNGOTableQuery);
        console.log('NGO table created successfully');
    } catch (error) {
        console.error('Error creating NGO table:', error);
        throw error;
    }
}
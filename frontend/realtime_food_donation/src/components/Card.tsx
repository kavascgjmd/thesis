import React from 'react';
import '../styles/Card.css';

interface CardProps {
    image: string;
    title: string;
    description: string;
}

const Card: React.FC<CardProps> = ({ image, title, description }) => {
    return (
        <div className="card">
            <img src={image} alt={title} />
            <h3 className="card-title">{title}</h3>
            <p className="card-description">{description}</p>
        </div>
    );
};

export default Card;

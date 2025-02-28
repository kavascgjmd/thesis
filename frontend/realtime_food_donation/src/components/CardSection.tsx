// src/components/CardSection.tsx
import React from 'react';
import Card from './Card';
import '../styles/CardSection.css';

const CardSection: React.FC = () => {
  const cards = [
    {
      title: "Order Online",
      description: "Stay home and order to your doorstep",
      imageUrl: "order_online_image.jpg",
    },
    {
      title: "Dining",
      description: "View the city's favourite dining venues",
      imageUrl: "dining_image.jpg",
    },
    {
      title: "Live Events",
      description: "Discover India's best events & concerts",
      imageUrl: "live_events_image.jpg",
    },
  ];

  return (
    <div className="card-section">
      {cards.map((card, index) => (
        <Card
          key={index}
          title={card.title}
          description={card.description}
          imageUrl={card.imageUrl}
        />
      ))}
    </div>
  );
};

export default CardSection;

import React from 'react';
import { Card } from '../components/ui/card/Card';
import { Phone, User } from 'lucide-react';

interface DriverDetailsProps {
  driver: {
    id: number;
    name: string;
    phone: string;
    email?: string;
    rating?: number;
    avatar?: string;
  } | null;
}

const DriverDetails: React.FC<DriverDetailsProps> = ({ driver }) => {
  if (!driver) return null;
  
  return (
    <Card className="p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Driver Details</h2>
      
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-4">
          {driver.avatar ? (
            <img src={driver.avatar} alt={driver.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <User className="h-6 w-6 text-gray-500" />
          )}
        </div>
        
        <div>
          <h3 className="font-medium">{driver.name}</h3>
          {driver.rating && (
            <div className="flex items-center">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${i < Math.round(driver.rating!) ? 'text-yellow-400' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-500 ml-1">{driver.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col space-y-2">
        <a 
          href={`tel:${driver.phone}`} 
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <Phone className="h-4 w-4 mr-2" />
          <span>{driver.phone}</span>
        </a>
        
        {driver.email && (
          <a 
            href={`mailto:${driver.email}`} 
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>{driver.email}</span>
          </a>
        )}
      </div>
    </Card>
  );
};

export default DriverDetails;
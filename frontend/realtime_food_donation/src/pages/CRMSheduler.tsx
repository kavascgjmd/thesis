import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Bell, MessageSquare, Tag, Users, AlertCircle } from 'lucide-react';

// Define types for our CRM records
interface CRMRecord {
  id: string;
  donorName: string;
  ngoName: string;
  foodType: string;
  quantity: string;
  pickupDate: string;
  pickupTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  contactInfo: string;
  notes?: string;
  lastNotified?: string;
}

interface NotificationSchedule {
  id: string;
  crmRecordId: string;
  recipientType: 'donor' | 'ngo';
  recipientId: string;
  recipientName: string;
  notificationType: 'reminder' | 'confirmation' | 'update';
  message: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'scheduled' | 'sent' | 'failed';
}

const NotificationScheduler: React.FC = () => {
  const [crmRecords, setCrmRecords] = useState<CRMRecord[]>([]);
  const [schedules, setSchedules] = useState<NotificationSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<CRMRecord | null>(null);
  
  // Form state for creating a new notification
  const [newNotification, setNewNotification] = useState<Partial<NotificationSchedule>>({
    recipientType: 'donor',
    notificationType: 'reminder',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00',
    status: 'scheduled'
  });

  // Fetch CRM records from API
  useEffect(() => {
    const fetchCRMRecords = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost/api/crm');
        if (!response.ok) {
          throw new Error('Failed to fetch CRM records');
        }
        const data = await response.json();
        setCrmRecords(data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching CRM records. Please try again later.');
        setLoading(false);
        console.error('Error fetching CRM records:', err);
      }
    };

    fetchCRMRecords();
  }, []);

  // Fetch existing notification schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await fetch('http://localhost/api/notifications');
        if (!response.ok) {
          throw new Error('Failed to fetch notification schedules');
        }
        const data = await response.json();
        setSchedules(data);
      } catch (err) {
        console.error('Error fetching notification schedules:', err);
      }
    };

    fetchSchedules();
  }, []);

  const handleRecordSelect = (record: CRMRecord) => {
    setSelectedRecord(record);
    setNewNotification({
      ...newNotification,
      crmRecordId: record.id,
      recipientName: record.donorName, // Default to donor name
      recipientId: record.id, // Would be replaced with actual donor ID in a real app
      message: `Reminder: Food donation pickup scheduled for ${record.pickupDate} at ${record.pickupTime}. Food type: ${record.foodType}, Quantity: ${record.quantity}.`
    });
  };

  const handleRecipientTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const recipientType = e.target.value as 'donor' | 'ngo';
    setNewNotification({
      ...newNotification,
      recipientType,
      recipientName: recipientType === 'donor' ? selectedRecord?.donorName : selectedRecord?.ngoName
    });
  };

  const handleNotificationTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const notificationType = e.target.value as 'reminder' | 'confirmation' | 'update';
    let message = '';
    
    // Generate a template message based on notification type
    if (selectedRecord) {
      switch (notificationType) {
        case 'reminder':
          message = `Reminder: Food donation pickup scheduled for ${selectedRecord.pickupDate} at ${selectedRecord.pickupTime}. Food type: ${selectedRecord.foodType}, Quantity: ${selectedRecord.quantity}.`;
          break;
        case 'confirmation':
          message = `Your food donation (${selectedRecord.foodType}) has been confirmed for pickup on ${selectedRecord.pickupDate} at ${selectedRecord.pickupTime}.`;
          break;
        case 'update':
          message = `Update regarding your food donation scheduled for ${selectedRecord.pickupDate}: Please confirm your availability.`;
          break;
      }
    }
    
    setNewNotification({
      ...newNotification,
      notificationType,
      message
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewNotification({
      ...newNotification,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newNotification)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create notification');
      }
      
      const createdNotification = await response.json();
      setSchedules([...schedules, createdNotification]);
      
      // Reset form
      setNewNotification({
        recipientType: 'donor',
        notificationType: 'reminder',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '09:00',
        status: 'scheduled'
      });
      
      setSelectedRecord(null);
      
      alert('Notification scheduled successfully!');
    } catch (err) {
      console.error('Error creating notification:', err);
      alert('Failed to schedule notification. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading CRM data...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md border border-red-100">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Food Donation Notification Scheduler</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CRM Records Section */}
        <div className="bg-white rounded-lg shadow p-6 col-span-1">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Food Donation Records
          </h2>
          
          <div className="overflow-y-auto max-h-96">
            {crmRecords.length === 0 ? (
              <p className="text-gray-500 text-sm">No records found</p>
            ) : (
              crmRecords.map(record => (
                <div 
                  key={record.id}
                  className={`mb-3 p-3 rounded-md cursor-pointer border transition-colors ${
                    selectedRecord?.id === record.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleRecordSelect(record)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{record.donorName}</h3>
                      <p className="text-sm text-gray-600">
                        <span className="inline-flex items-center">
                          <Tag className="h-4 w-4 mr-1" /> 
                          {record.foodType}
                        </span>
                        {' • '}
                        <span className="inline-flex items-center">
                          <Calendar className="h-4 w-4 mr-1" /> 
                          {record.pickupDate}
                        </span>
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      record.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      record.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      record.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Create Notification Form */}
        <div className="bg-white rounded-lg shadow p-6 col-span-1">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Schedule Notification
          </h2>
          
          {!selectedRecord ? (
            <p className="text-gray-500 text-sm">Select a food donation record to schedule notifications</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selected Donation
                </label>
                <div className="p-3 bg-gray-50 rounded-md text-sm">
                  <p><strong>Donor:</strong> {selectedRecord.donorName}</p>
                  <p><strong>NGO:</strong> {selectedRecord.ngoName}</p>
                  <p><strong>Food:</strong> {selectedRecord.foodType} ({selectedRecord.quantity})</p>
                  <p><strong>Pickup:</strong> {selectedRecord.pickupDate} at {selectedRecord.pickupTime}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="recipientType" className="block text-sm font-medium text-gray-700 mb-1">
                  Notify
                </label>
                <select
                  id="recipientType"
                  name="recipientType"
                  value={newNotification.recipientType}
                  onChange={handleRecipientTypeChange}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="donor">Donor ({selectedRecord.donorName})</option>
                  <option value="ngo">NGO ({selectedRecord.ngoName})</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="notificationType" className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Type
                </label>
                <select
                  id="notificationType"
                  name="notificationType"
                  value={newNotification.notificationType}
                  onChange={handleNotificationTypeChange}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="reminder">Reminder</option>
                  <option value="confirmation">Confirmation</option>
                  <option value="update">Update</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="scheduledDate"
                      name="scheduledDate"
                      value={newNotification.scheduledDate}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="time"
                      id="scheduledTime"
                      name="scheduledTime"
                      value={newNotification.scheduledTime}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 text-sm"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                  </div>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={newNotification.message}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 text-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Schedule Notification
                </button>
              </div>
            </form>
          )}
        </div>
        
        {/* Upcoming Notifications */}
        <div className="bg-white rounded-lg shadow p-6 col-span-1">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Scheduled Notifications
          </h2>
          
          <div className="overflow-y-auto max-h-96">
            {schedules.length === 0 ? (
              <p className="text-gray-500 text-sm">No scheduled notifications</p>
            ) : (
              schedules.map(schedule => (
                <div 
                  key={schedule.id} 
                  className={`mb-3 p-3 rounded-md border ${
                    schedule.status === 'sent' ? 'border-gray-200 bg-gray-50' : 
                    schedule.status === 'failed' ? 'border-red-200 bg-red-50' : 
                    'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{schedule.recipientName}</h3>
                      <p className="text-xs text-gray-600">
                        <span className="inline-flex items-center">
                          <Calendar className="h-3 w-3 mr-1" /> 
                          {schedule.scheduledDate}
                        </span>
                        {' • '}
                        <span className="inline-flex items-center">
                          <Clock className="h-3 w-3 mr-1" /> 
                          {schedule.scheduledTime}
                        </span>
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      schedule.status === 'sent' ? 'bg-green-100 text-green-800' :
                      schedule.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 line-clamp-2">{schedule.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationScheduler;
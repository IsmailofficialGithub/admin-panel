'use client';

import { useState } from 'react';
import { Modal } from '../ui/Model';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { generatePassword } from '@/lib/randomPassword/rmPassword';
export function CreateConsumerModal({ isOpen, onClose, onSuccess }) {

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/consumers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone === "" ? null : formData.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite');
        
      }

      setMessage(`✅ Invitation sent to ${formData.email}`);
      setTimeout(() => {
        setMessage("");
      },5000);
      setFormData({ email: ''});

      onSuccess?.();
    } catch (err) {
      console.error(err);
      setError(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Consumer">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {message}
          </div>
        )}

         <Input
                  label="Full Name"
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Full Name"
                  required
                />
        
                <Input
                  label="Email"
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                />
                <Input
                  label="Phone"
                  id="phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0311111111"
                />
                <Input
                  label="Password"
                  id="password"
                  type="text"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="*********"
                  required
                />
                <Button
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      password: generatePassword(12),
                    }));
                  }}
                >
                  random
                </Button>

        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Consumer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export interface Vehicle {
  id: string;
  license_plate: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  status: 'available' | 'maintenance' | 'out_of_service';
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  full_name: string;
  phone_number: string;
  license_number: string;
  license_type?: string;
  license_expiry?: string;
  status: 'available' | 'busy' | 'unavailable';
  institution_id: string;
  created_at: string;
  updated_at: string;
}

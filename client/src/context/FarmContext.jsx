import { createContext, useContext, useEffect, useState } from 'react';
import { useOrganization } from '@clerk/clerk-react';
import { api } from '../lib/api.js';

const FarmContext = createContext(null);

export function FarmProvider({ children }) {
  const { organization } = useOrganization();
  const [farm, setFarm] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    setLoading(true);
    api.farm.get()
      .then(data => {
        setFarm(data);
        setRole(data.role);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organization?.id]);

  const isActive = farm?.billing_status === 'active';
  const trialValid = farm?.billing_status === 'trial' && farm?.trial_ends_at && new Date(farm.trial_ends_at) > new Date();
  const isTrialExpired = !!farm && !isActive && !trialValid;

  return (
    <FarmContext.Provider value={{ farm, role, loading, isAdmin: role === 'admin', isTrialExpired }}>
      {children}
    </FarmContext.Provider>
  );
}

export const useFarm = () => useContext(FarmContext);

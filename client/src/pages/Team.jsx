import { useEffect, useState } from 'react';
import { useOrganization } from '@clerk/clerk-react';
import { api } from '../lib/api.js';
import PageHeader from '../components/PageHeader.jsx';
import { Shield, User, Truck } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Admin', icon: Shield, desc: 'Full access including financials', color: 'text-soil-300' },
  { value: 'employee', label: 'Employee', icon: User, desc: 'Log loads only', color: 'text-blue-300' },
  { value: 'trucker', label: 'Trucker', icon: Truck, desc: 'View loads across linked farms', color: 'text-emerald-300' },
];

export default function Team() {
  const { organization, invitations, memberships } = useOrganization({
    invitations: true,
    memberships: { infinite: true },
  });
  const [teamUsers, setTeamUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteRole, setInviteRole] = useState('employee');

  useEffect(() => {
    api.team.list().then(setTeamUsers).finally(() => setLoading(false));
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail || !organization) return;
    setInviting(true);
    try {
      await organization.inviteMember({ emailAddress: inviteEmail, role: 'org:member' });
      setInviteEmail('');
      alert(`Invite sent to ${inviteEmail}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (clerkUserId, role) => {
    await api.team.setRole(clerkUserId, role);
    setTeamUsers(u => u.map(m => m.clerk_user_id === clerkUserId ? { ...m, role } : m));
  };

  const getRoleInfo = (role) => ROLES.find(r => r.value === role) || ROLES[1];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader title="Team" subtitle="Manage who has access to your farm" />

      {/* Invite */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Invite a team member</h2>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="employee@farm.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
          />
          <select className="input w-36" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
            <option value="trucker">Trucker</option>
          </select>
          <button className="btn-primary" onClick={handleInvite} disabled={inviting}>
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">They'll receive an email to join your farm on FarmPulse.</p>
      </div>

      {/* Roles legend */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {ROLES.map(({ value, label, icon: Icon, desc, color }) => (
          <div key={value} className="card-sm flex items-start gap-3">
            <Icon size={16} className={color} />
            <div>
              <div className={`text-sm font-medium ${color}`}>{label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Members */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-3 border-b border-slate-800 text-xs text-slate-500 font-medium uppercase tracking-wider">
          Current Members
        </div>
        {loading ? (
          <div className="px-5 py-8 text-slate-500 text-sm text-center">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {teamUsers.map(member => {
                const roleInfo = getRoleInfo(member.role);
                const RoleIcon = roleInfo.icon;
                return (
                  <tr key={member.id} className="table-row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 font-medium">
                          {member.clerk_user_id.slice(5, 7).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-slate-200 font-medium text-xs font-mono">{member.clerk_user_id}</div>
                          <div className="text-slate-500 text-xs">Joined {new Date(member.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        className="input !w-auto text-xs py-1"
                        value={member.role}
                        onChange={e => handleRoleChange(member.clerk_user_id, e.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="employee">Employee</option>
                        <option value="trucker">Trucker</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`flex items-center gap-1.5 text-xs ${roleInfo.color}`}>
                        <RoleIcon size={12} />
                        {roleInfo.desc}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {teamUsers.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-500">No team members yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  AlertTriangle, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit2,
  Settings,
  Activity,
  ShieldAlert,
  Navigation,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { cn, formatDateTime } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'operator';
}

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  phone: string;
  createdAt: any;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  driverId: string;
  speedLimit: number;
  status: 'active' | 'inactive';
  currentSpeed: number;
  lastUpdate: any;
}

interface Alert {
  id: string;
  vehicleId: string;
  plateNumber: string;
  speed: number;
  speedLimit: number;
  message: string;
  createdAt: any;
}

interface TrackingData {
  id: string;
  vehicleId: string;
  speed: number;
  latitude: number;
  longitude: number;
  recordedAt: any;
}

// --- Components ---

const Sidebar = ({ user, onSignOut }: { user: UserProfile | null, onSignOut: () => void }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/vehicles', label: 'Vehicles', icon: Truck },
    { path: '/drivers', label: 'Drivers', icon: Users },
    { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2 bg-blue-600 rounded-lg">
              <ShieldAlert size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FleetGuard</h1>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    isActive 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

const LoginPage = ({ onLogin }: { onLogin: () => void }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center"
      >
        <div className="inline-flex p-4 bg-blue-50 rounded-2xl mb-6">
          <ShieldAlert size={48} className="text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">FleetGuard</h1>
        <p className="text-slate-500 mb-10">Advanced Fleet Management & Speed Monitoring System</p>
        
        <button
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-2xl font-semibold hover:bg-slate-800 transition-all active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          Sign in with Google
        </button>
        
        <p className="mt-8 text-xs text-slate-400">
          Secure access for authorized fleet operators and administrators only.
        </p>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ vehicles, alerts }: { vehicles: Vehicle[], alerts: Alert[] }) => {
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const overspeedingCount = vehicles.filter(v => v.currentSpeed > v.speedLimit).length;
  
  const chartData = vehicles.map(v => ({
    name: v.plateNumber,
    speed: v.currentSpeed,
    limit: v.speedLimit
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Fleet Overview</h1>
        <p className="text-slate-500">Real-time monitoring and system status</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Vehicles', value: vehicles.length, icon: Truck, color: 'bg-blue-500' },
          { label: 'Active Now', value: activeVehicles, icon: Activity, color: 'bg-emerald-500' },
          { label: 'Overspeeding', value: overspeedingCount, icon: AlertTriangle, color: 'bg-rose-500' },
          { label: 'Total Alerts', value: alerts.length, icon: ShieldAlert, color: 'bg-amber-500' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
          >
            <div className={cn("inline-flex p-3 rounded-2xl mb-4 text-white", stat.color)}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Speed Monitoring</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSpeed)" />
                <Line type="monotone" dataKey="limit" stroke="#f43f5e" strokeDasharray="5 5" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Recent Alerts</h2>
            <Link to="/alerts" className="text-sm text-blue-600 font-medium hover:underline">View All</Link>
          </div>
          <div className="space-y-4">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl h-fit">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{alert.plateNumber}</p>
                  <p className="text-xs text-slate-500 mb-1">{alert.message}</p>
                  <p className="text-[10px] text-slate-400">{formatDateTime(alert.createdAt)}</p>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <ShieldAlert size={48} className="mx-auto mb-3 opacity-20" />
                <p>No alerts detected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Live Fleet Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-8 py-4 font-semibold">Vehicle</th>
                <th className="px-8 py-4 font-semibold">Speed</th>
                <th className="px-8 py-4 font-semibold">Limit</th>
                <th className="px-8 py-4 font-semibold">Status</th>
                <th className="px-8 py-4 font-semibold">Last Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <Truck size={18} className="text-slate-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{v.plateNumber}</p>
                        <p className="text-xs text-slate-500">{v.model}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "font-mono font-bold text-lg",
                      v.currentSpeed > v.speedLimit ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {v.currentSpeed.toFixed(1)} <span className="text-xs font-normal text-slate-400">km/h</span>
                    </span>
                  </td>
                  <td className="px-8 py-5 text-slate-600 font-medium">{v.speedLimit} km/h</td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      v.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs text-slate-400">
                    {v.lastUpdate ? formatDateTime(v.lastUpdate) : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const VehiclesPage = ({ vehicles, drivers, isAdmin }: { vehicles: Vehicle[], drivers: Driver[], isAdmin: boolean }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: '',
    model: '',
    driverId: '',
    speedLimit: 80,
    status: 'active' as 'active' | 'inactive'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'vehicles'), {
        ...formData,
        currentSpeed: 0,
        lastUpdate: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({ plateNumber: '', model: '', driverId: '', speedLimit: 80, status: 'active' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'vehicles');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await deleteDoc(doc(db, 'vehicles', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'vehicles');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Vehicles</h1>
          <p className="text-slate-500">Manage your fleet inventory</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            <span>Add Vehicle</span>
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((v) => (
          <motion.div 
            layout
            key={v.id}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                <Truck size={24} />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(v.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-1">{v.plateNumber}</h3>
            <p className="text-sm text-slate-500 mb-6">{v.model}</p>
            
            <div className="space-y-3 pt-6 border-t border-slate-50">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Driver</span>
                <span className="font-semibold text-slate-700">
                  {drivers.find(d => d.id === v.driverId)?.name || 'Unassigned'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Speed Limit</span>
                <span className="font-semibold text-slate-700">{v.speedLimit} km/h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <span className={cn(
                  "font-bold uppercase text-[10px]",
                  v.status === 'active' ? "text-emerald-600" : "text-slate-400"
                )}>{v.status}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Add New Vehicle</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Plate Number</label>
                    <input 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="KAA 123X"
                      value={formData.plateNumber}
                      onChange={e => setFormData({...formData, plateNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Model</label>
                    <input 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Toyota Isuzu"
                      value={formData.model}
                      onChange={e => setFormData({...formData, model: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Assign Driver</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={formData.driverId}
                    onChange={e => setFormData({...formData, driverId: e.target.value})}
                  >
                    <option value="">Select a driver</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Speed Limit (km/h)</label>
                    <input 
                      type="number"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={formData.speedLimit}
                      onChange={e => setFormData({...formData, speedLimit: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Initial Status</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                  Register Vehicle
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DriversPage = ({ drivers, isAdmin }: { drivers: Driver[], isAdmin: boolean }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', licenseNumber: '', phone: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'drivers'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({ name: '', licenseNumber: '', phone: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'drivers');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this driver?')) return;
    try {
      await deleteDoc(doc(db, 'drivers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'drivers');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Drivers</h1>
          <p className="text-slate-500">Manage personnel and licenses</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            <span>Add Driver</span>
          </button>
        )}
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-8 py-4 font-semibold">Name</th>
              <th className="px-8 py-4 font-semibold">License No.</th>
              <th className="px-8 py-4 font-semibold">Phone</th>
              <th className="px-8 py-4 font-semibold">Added On</th>
              {isAdmin && <th className="px-8 py-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drivers.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      {d.name[0]}
                    </div>
                    <span className="font-bold text-slate-900">{d.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-slate-600 font-mono">{d.licenseNumber}</td>
                <td className="px-8 py-5 text-slate-600">{d.phone}</td>
                <td className="px-8 py-5 text-xs text-slate-400">{formatDateTime(d.createdAt)}</td>
                {isAdmin && (
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDelete(d.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Add Driver</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <input 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">License Number</label>
                  <input 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.licenseNumber}
                    onChange={e => setFormData({...formData, licenseNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                  <input 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                  Save Driver
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AlertsPage = ({ alerts, isAdmin }: { alerts: Alert[], isAdmin: boolean }) => {
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'alerts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'alerts');
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Alert History</h1>
        <p className="text-slate-500">System generated overspeed logs</p>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-8 py-4 font-semibold">Vehicle</th>
              <th className="px-8 py-4 font-semibold">Recorded Speed</th>
              <th className="px-8 py-4 font-semibold">Limit</th>
              <th className="px-8 py-4 font-semibold">Message</th>
              <th className="px-8 py-4 font-semibold">Timestamp</th>
              {isAdmin && <th className="px-8 py-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {alerts.map((a) => (
              <tr key={a.id} className="hover:bg-rose-50/30 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                      <AlertTriangle size={18} />
                    </div>
                    <span className="font-bold text-slate-900">{a.plateNumber}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-rose-600 font-bold">{a.speed.toFixed(1)} km/h</span>
                </td>
                <td className="px-8 py-5 text-slate-500">{a.speedLimit} km/h</td>
                <td className="px-8 py-5 text-slate-600 text-sm">{a.message}</td>
                <td className="px-8 py-5 text-xs text-slate-400">{formatDateTime(a.createdAt)}</td>
                {isAdmin && (
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDelete(a.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center text-slate-400">
                  <ShieldAlert size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No alerts recorded in the system</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() } as UserProfile);
        } else {
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            role: firebaseUser.email === 'dancunkiplangat865@gmail.com' ? 'admin' : 'operator'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            createdAt: serverTimestamp()
          });
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snapshot) => {
      setVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });

    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snapshot) => {
      setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver)));
    });

    const unsubAlerts = onSnapshot(query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert)));
    });

    return () => {
      unsubVehicles();
      unsubDrivers();
      unsubAlerts();
    };
  }, [user]);

  // Simulation Logic
  useEffect(() => {
    if (!user || vehicles.length === 0) return;

    const interval = setInterval(async () => {
      const activeVehicles = vehicles.filter(v => v.status === 'active');
      if (activeVehicles.length === 0) return;

      // Pick a random vehicle to update
      const vehicle = activeVehicles[Math.floor(Math.random() * activeVehicles.length)];
      
      // Simulate speed: mostly normal, occasionally overspeeding
      const isOverspeeding = Math.random() > 0.85;
      const newSpeed = isOverspeeding 
        ? vehicle.speedLimit + (Math.random() * 30) 
        : (Math.random() * vehicle.speedLimit);

      try {
        await updateDoc(doc(db, 'vehicles', vehicle.id), {
          currentSpeed: newSpeed,
          lastUpdate: serverTimestamp()
        });

        if (newSpeed > vehicle.speedLimit) {
          await addDoc(collection(db, 'alerts'), {
            vehicleId: vehicle.id,
            plateNumber: vehicle.plateNumber,
            speed: newSpeed,
            speedLimit: vehicle.speedLimit,
            message: `Overspeeding detected: ${newSpeed.toFixed(1)} km/h`,
            createdAt: serverTimestamp()
          });
        }
      } catch (error) {
        console.error("Simulation error:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, vehicles]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Activity className="text-blue-600 animate-pulse" size={48} />
          <p className="text-slate-400 font-medium animate-pulse">Initializing FleetGuard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar user={user} onSignOut={handleSignOut} />
      
      <main className="flex-1 lg:ml-64 p-6 lg:p-10">
        <div className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard vehicles={vehicles} alerts={alerts} />} />
            <Route path="/vehicles" element={<VehiclesPage vehicles={vehicles} drivers={drivers} isAdmin={user.role === 'admin'} />} />
            <Route path="/drivers" element={<DriversPage drivers={drivers} isAdmin={user.role === 'admin'} />} />
            <Route path="/alerts" element={<AlertsPage alerts={alerts} isAdmin={user.role === 'admin'} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#b01622] mr-2"></i>
        Loading dashboard data...
      </div>
    );
  }

  const summary = data?.summary || {};
  const liveJobs = data?.liveJobs || [];
  const materialAllocation = data?.materialAllocation || [];
  const qcQueue = data?.qcQueue || [];

  return (
    <div className="w-full pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time Artisan performance and order distribution tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
            <i className="fa-solid fa-filter text-gray-400 text-xs"></i>
            Month
            <i className="fa-solid fa-chevron-down text-gray-400 text-[10px] ml-1"></i>
          </button>
          <button className="px-4 py-2 bg-white border border-[#b01622] text-[#b01622] rounded-md text-sm font-medium hover:bg-red-50 shadow-sm transition-colors">
            Download Report
          </button>
          <Link to="/job-creation/new" className="px-4 py-2 bg-[#b01622] text-white rounded-md text-sm font-medium hover:bg-[#90121b] shadow-sm flex items-center gap-2 transition-colors">
            <i className="fa-solid fa-plus text-xs"></i>
            New Work Order
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-md bg-red-50 flex items-center justify-center text-[#b01622]">
              <i className="fa-solid fa-users-gear"></i>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
              +3 New
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">ACTIVE ARTISANS</p>
            <div className="text-2xl font-bold text-gray-900 mb-1">{summary.activeArtisans || 42}</div>
            <div className="flex items-center text-xs text-gray-500">
              <span className="text-green-600 flex items-center gap-1 font-medium mr-1">
                <i className="fa-solid fa-arrow-trend-up text-[10px]"></i> {summary.activeArtisansChange || '12%'}
              </span>
              vs last month
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="w-10 h-10 rounded-md bg-orange-50 flex items-center justify-center text-orange-500 mb-2">
            <i className="fa-regular fa-calendar-minus"></i>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">PENDING ORDERS</p>
            <div className="text-2xl font-bold text-gray-900 mb-1">{summary.pendingOrders || 18}</div>
            <div className="flex items-center text-xs text-gray-500">
              <span className="text-red-500 flex items-center gap-1 font-medium mr-1 bg-red-50 px-1.5 py-0.5 rounded">
                <i className="fa-solid fa-triangle-exclamation text-[10px]"></i> {summary.overdueItems || 4}
              </span>
              Overdue items
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center text-blue-500 mb-2">
            <i className="fa-solid fa-clipboard-check"></i>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">QC PENDING</p>
            <div className="text-2xl font-bold text-gray-900 mb-1">{summary.qcPending || 18}</div>
            <div className="flex items-center text-xs text-gray-500">
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium mr-1 flex items-center gap-1">
                <i className="fa-solid fa-arrow-up text-[10px]"></i> {summary.qcThisWeek || 3}
              </span>
              this week
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="w-10 h-10 rounded-md bg-green-50 flex items-center justify-center text-green-600 mb-2">
            <i className="fa-solid fa-check-double"></i>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">COMPLETED JOBS</p>
            <div className="text-2xl font-bold text-gray-900 mb-1">{summary.completedJobs || 64}</div>
            <div className="flex items-center text-xs text-gray-500">
              <i className="fa-solid fa-indian-rupee-sign mr-1 text-[10px]"></i> Value: {summary.completedValue || '6,74,820'}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Left: Live Job Status */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-900">Live Job creation Status</h2>
            <a href="#" onClick={(e) => e.preventDefault()} className="text-xs font-medium text-[#b01622] hover:underline">View Full Queue</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3 font-semibold">ARTISAN NAME</th>
                  <th className="px-5 py-3 font-semibold">ORDER ID</th>
                  <th className="px-5 py-3 font-semibold">ITEM TYPE</th>
                  <th className="px-5 py-3 font-semibold">STAGE</th>
                  <th className="px-5 py-3 font-semibold">DUE DATE</th>
                  <th className="px-5 py-3 font-semibold text-right"></th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {liveJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-${job.badgeColor}-100 text-${job.badgeColor}-700 flex items-center justify-center text-xs font-bold`}>
                          {job.initials}
                        </div>
                        <span className="font-medium text-gray-900">{job.artisan}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{job.orderId}</td>
                    <td className="px-5 py-4 text-gray-600">{job.itemType}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        job.badgeColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        job.badgeColor === 'green' ? 'bg-green-100 text-green-800' :
                        job.badgeColor === 'red' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {job.stage}
                      </span>
                    </td>
                    <td className={`px-5 py-4 ${job.badgeColor === 'red' ? 'text-[#b01622] font-medium' : 'text-gray-600'}`}>
                      {job.dueDate}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-ellipsis-vertical"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Material Allocation */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-gray-200">
            <h2 class="text-base font-semibold text-gray-900">Material Allocation</h2>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-6">
            {materialAllocation.map((item, idx) => (
              <div key={idx} className="relative pl-3">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.color} rounded-full`}></div>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="font-medium text-sm text-gray-900">{item.artisan}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{item.material}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-gray-900">{item.issued}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Bal: {item.balance}</div>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                  <div className={`${item.color} h-1 rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-100 mt-auto">
            <button className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-md border border-gray-200 transition-colors">
              Detailed Audit Log
            </button>
          </div>
        </div>
      </div>

      {/* Quality Check Queue */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quality Check Queue (Final Approval)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {qcQueue.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col relative group">
              {item.priority && (
                <div className="absolute top-2 right-2 bg-white px-2 py-0.5 rounded text-[9px] font-bold text-gray-800 shadow-sm z-10 border border-gray-100 uppercase">
                  Priority
                </div>
              )}
              <div className="h-40 bg-gray-100 relative overflow-hidden">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate pr-2">{item.title}</h3>
                  <span className="text-[9px] text-gray-500 whitespace-nowrap pt-0.5">{item.id}</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-4">Artisan: {item.artisan}</p>
                <div className="flex gap-2 mt-auto">
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-medium py-1.5 rounded transition-colors">Approve</button>
                  <button className="flex-1 bg-white border border-red-500 hover:bg-red-50 text-red-600 text-[11px] font-medium py-1.5 rounded transition-colors">Reject</button>
                </div>
              </div>
            </div>
          ))}

          {/* More Items Card */}
          <div className="bg-[#fcfcfc] rounded-xl border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 cursor-pointer overflow-hidden flex flex-col items-center justify-center min-h-[260px] transition-colors">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 mb-3">
              <i className="fa-solid fa-plus text-lg"></i>
            </div>
            <h3 className="text-sm font-semibold text-gray-700">View 12 More Items</h3>
            <p className="text-[10px] text-gray-400 mt-1 text-center">Items waiting for floor manager<br />inspection</p>
          </div>
        </div>
      </div>
    </div>
  );
}

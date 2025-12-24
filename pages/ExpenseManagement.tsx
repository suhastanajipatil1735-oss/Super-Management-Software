
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Expense, TeacherProfile, ReceiptLog } from '../types';
import { db } from '../services/db';
import { Card, Button, Input, Select, Modal } from '../components/UI';
import { 
    ArrowLeft, Plus, TrendingUp, Users, FileText, 
    Trash2, Edit3, Save, IndianRupee, Calendar, 
    Download, Briefcase, Zap, Globe, MoreHorizontal,
    TrendingDown, PieChart as PieChartIcon
} from 'lucide-react';
import { formatCurrency } from '../services/whatsapp';
import jsPDF from 'jspdf';

interface ExpenseManagementProps {
  user: UserProfile;
  lang: 'en' | 'mr';
  onBack: () => void;
}

const CATEGORIES = [
    { value: 'Salary', label: 'Teacher Salary', icon: <Briefcase size={16} /> },
    { value: 'Rent', label: 'Rent / Lease', icon: < IndianRupee size={16} /> },
    { value: 'Electricity', label: 'Electricity Bill', icon: <Zap size={16} /> },
    { value: 'Internet', label: 'Internet / Wi-Fi', icon: <Globe size={16} /> },
    { value: 'Other', label: 'Others', icon: <MoreHorizontal size={16} /> },
];

const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ user, lang, onBack }) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'teachers' | 'reports'>('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  
  // Modals
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);

  // Form States
  const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
    category: 'Other',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [teacherForm, setTeacherForm] = useState<Partial<TeacherProfile>>({
    name: '',
    mobile: '',
    salaryAmount: 0,
    joiningDate: new Date().toISOString().split('T')[0]
  });

  // Report State
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [user.mobile]);

  const loadData = async () => {
    const exps = await db.expenses.where('ownerMobile').equals(user.mobile).reverse().sortBy('date');
    const tchs = await db.teacherProfiles.where('ownerMobile').equals(user.mobile).toArray();
    setExpenses(exps);
    setTeachers(tchs);
  };

  const handleSaveTeacher = async () => {
    if (!teacherForm.name || !teacherForm.mobile) return alert("Fill required fields");
    
    const data: TeacherProfile = {
        ownerMobile: user.mobile,
        name: teacherForm.name,
        mobile: teacherForm.mobile,
        salaryAmount: Number(teacherForm.salaryAmount),
        joiningDate: teacherForm.joiningDate || new Date().toISOString().split('T')[0]
    };

    if (editingTeacher) {
        await db.teacherProfiles.update(editingTeacher.id!, data);
    } else {
        await db.teacherProfiles.add(data);
    }

    setEditingTeacher(null);
    setTeacherForm({ name: '', mobile: '', salaryAmount: 0, joiningDate: new Date().toISOString().split('T')[0] });
    setShowAddTeacher(false);
    loadData();
  };

  const handleDeleteTeacher = async (id: number) => {
    if (confirm("Delete this teacher profile?")) {
        await db.teacherProfiles.delete(id);
        loadData();
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.amount || expenseForm.amount <= 0) return alert("Enter valid amount");
    
    const data: Expense = {
        ownerMobile: user.mobile,
        category: expenseForm.category as any,
        amount: Number(expenseForm.amount),
        date: expenseForm.date || new Date().toISOString().split('T')[0],
        description: expenseForm.description || '',
        teacherId: expenseForm.teacherId
    };

    await db.expenses.add(data);
    setShowAddExpense(false);
    setExpenseForm({ category: 'Other', amount: 0, date: new Date().toISOString().split('T')[0], description: '' });
    loadData();
  };

  const handleDeleteExpense = async (id: number) => {
    if (confirm("Delete this expense record?")) {
        await db.expenses.delete(id);
        loadData();
    }
  };

  // Report Calculations
  const reportStats = useMemo(() => {
    const filteredExpenses = expenses.filter(e => e.date.startsWith(reportMonth));
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Summary by category
    const catSummary = CATEGORIES.reduce((acc, cat) => {
        acc[cat.value] = filteredExpenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amount, 0);
        return acc;
    }, {} as Record<string, number>);

    return { totalExpenses, catSummary, filteredExpenses };
  }, [expenses, reportMonth]);

  const generatePDFReport = async () => {
    setIsProcessing(true);
    try {
        // Fetch revenue from receipt logs for selected month
        const logs = await db.receiptLogs.where('ownerMobile').equals(user.mobile).toArray();
        const monthlyRevenue = logs
            .filter(l => l.date.startsWith(reportMonth))
            .reduce((sum, l) => sum + l.amount, 0);

        const doc = new jsPDF();
        const profit = monthlyRevenue - reportStats.totalExpenses;

        // Header
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text(user.instituteName.toUpperCase(), 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`FINANCIAL REPORT: ${new Date(reportMonth + "-01").toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`, 105, 25, { align: 'center' });
        doc.setFontSize(8);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 32, { align: 'center' });

        // Summary Cards
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("MONTHLY SUMMARY", 20, 55);
        doc.line(20, 57, 70, 57);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Revenue Row
        doc.setFillColor(240, 253, 244);
        doc.rect(20, 65, 170, 12, 'F');
        doc.text("Total Revenue (Fees Collected)", 25, 73);
        doc.text(formatCurrency(monthlyRevenue), 185, 73, { align: 'right' });

        // Expense Row
        doc.setFillColor(254, 242, 242);
        doc.rect(20, 80, 170, 12, 'F');
        doc.text("Total Expenses", 25, 88);
        doc.text(`- ${formatCurrency(reportStats.totalExpenses)}`, 185, 88, { align: 'right' });

        // Result Row
        doc.setFillColor(profit >= 0 ? 240 : 255, profit >= 0 ? 253 : 241, profit >= 0 ? 244 : 241);
        doc.rect(20, 95, 170, 15, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(profit >= 0 ? "NET PROFIT" : "NET LOSS", 25, 105);
        doc.text(formatCurrency(profit), 185, 105, { align: 'right' });

        // Category Breakdown
        doc.setFontSize(14);
        doc.text("EXPENSE BREAKDOWN", 20, 125);
        doc.line(20, 127, 75, 127);
        
        let y = 135;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        // Fix: Explicitly cast Object.entries to [string, number][] to avoid 'unknown' type for 'amt'
        (Object.entries(reportStats.catSummary) as [string, number][]).forEach(([cat, amt]) => {
            if (amt > 0) {
                doc.text(cat, 25, y);
                doc.text(formatCurrency(amt), 185, y, { align: 'right' });
                doc.line(25, y+2, 185, y+2);
                y += 10;
            }
        });

        // Detailed Transaction List
        doc.setFont("helvetica", "bold");
        doc.text("TRANSACTION HISTORY", 20, y + 15);
        y += 22;
        doc.setFontSize(8);
        doc.setFillColor(241, 245, 249);
        doc.rect(20, y-4, 170, 7, 'F');
        doc.text("Date", 25, y);
        doc.text("Category", 60, y);
        doc.text("Description", 100, y);
        doc.text("Amount", 185, y, { align: 'right' });
        y += 8;
        
        doc.setFont("helvetica", "normal");
        reportStats.filteredExpenses.forEach(exp => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(exp.date, 25, y);
            doc.text(exp.category, 60, y);
            doc.text(exp.description.slice(0, 30), 100, y);
            doc.text(formatCurrency(exp.amount), 185, y, { align: 'right' });
            y += 6;
        });

        doc.save(`Report_${reportMonth}_${user.instituteName.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
        alert("Failed to generate PDF");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold">Expense Management</h2>
      </div>

      <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm w-fit">
           <button 
             onClick={() => setActiveTab('expenses')} 
             className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'expenses' ? 'bg-[#1e293b] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
           >
               <TrendingDown size={16} /> Expenses
           </button>
           <button 
             onClick={() => setActiveTab('teachers')} 
             className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'teachers' ? 'bg-[#1e293b] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
           >
               <Users size={16} /> Teacher Profiles
           </button>
           <button 
             onClick={() => setActiveTab('reports')} 
             className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'reports' ? 'bg-[#1e293b] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
           >
               <PieChartIcon size={16} /> Profit & Loss
           </button>
      </div>

      {activeTab === 'expenses' && (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Transaction History</h3>
                  <Button onClick={() => setShowAddExpense(true)} className="bg-red-600 hover:bg-red-700">
                      <Plus size={18} /> Add Expense
                  </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {expenses.map(exp => (
                      <Card key={exp.id} className="relative group border-l-4 border-l-red-500">
                          <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-bold uppercase">{exp.category}</span>
                              <button onClick={() => handleDeleteExpense(exp.id!)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                          <h4 className="font-bold text-gray-800 text-lg">{formatCurrency(exp.amount)}</h4>
                          <p className="text-xs text-gray-500 mb-2 truncate">{exp.description || 'No description'}</p>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              <Calendar size={10} /> {exp.date}
                          </div>
                      </Card>
                  ))}
                  {expenses.length === 0 && (
                      <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed border-gray-200">
                          <TrendingUp size={48} className="mx-auto text-gray-100 mb-4" />
                          <p className="text-gray-400 font-medium">No expenses recorded yet.</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {activeTab === 'teachers' && (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Staff Directory</h3>
                  <Button onClick={() => setShowAddTeacher(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus size={18} /> Create Teacher Profile
                  </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teachers.map(teacher => (
                      <Card key={teacher.id} className="group border-l-4 border-l-blue-500">
                          <div className="flex justify-between items-start mb-4">
                              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                                  {teacher.name.charAt(0)}
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => { setEditingTeacher(teacher); setTeacherForm(teacher); setShowAddTeacher(true); }} className="text-gray-400 hover:text-blue-600 p-1">
                                      <Edit3 size={16} />
                                  </button>
                                  <button onClick={() => handleDeleteTeacher(teacher.id!)} className="text-gray-400 hover:text-red-500 p-1">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                          <h4 className="font-bold text-gray-800">{teacher.name}</h4>
                          <p className="text-xs text-gray-500 mb-3">{teacher.mobile}</p>
                          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                              <span className="text-xs text-gray-400 uppercase font-bold">Salary</span>
                              <span className="font-bold text-green-600">{formatCurrency(teacher.salaryAmount)}</span>
                          </div>
                      </Card>
                  ))}
                  {teachers.length === 0 && (
                      <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed border-gray-200">
                          <Users size={48} className="mx-auto text-gray-100 mb-4" />
                          <p className="text-gray-400 font-medium">No teacher profiles found.</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {activeTab === 'reports' && (
          <div className="space-y-6">
              <Card className="bg-gradient-to-br from-[#1e293b] to-[#334155] text-white border-none shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div>
                          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Select Month for Report</p>
                          <input 
                            type="month" 
                            className="bg-white/10 border border-white/20 text-white p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
                            value={reportMonth}
                            onChange={(e) => setReportMonth(e.target.value)}
                          />
                      </div>
                      <div className="flex gap-4">
                          <div className="text-center bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm min-w-[140px]">
                              <p className="text-[10px] text-gray-400 uppercase font-bold">Monthly Expenses</p>
                              <p className="text-xl font-bold text-red-400">{formatCurrency(reportStats.totalExpenses)}</p>
                          </div>
                          <Button 
                            className="bg-blue-500 hover:bg-blue-600 h-14 px-8 font-black text-lg shadow-lg"
                            onClick={generatePDFReport}
                            disabled={isProcessing}
                          >
                              {isProcessing ? "GENERATING..." : <><Download size={20} /> DOWNLOAD PDF REPORT</>}
                          </Button>
                      </div>
                  </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <FileText size={18} className="text-blue-500" /> Expense Breakdown
                      </h3>
                      <div className="space-y-4">
                          {/* Fix: Explicitly cast Object.entries to [string, number][] to avoid 'unknown' type for 'amt' */}
                          {(Object.entries(reportStats.catSummary) as [string, number][]).map(([cat, amt]) => (
                              <div key={cat} className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                      <span className="text-gray-600 font-medium">{cat}</span>
                                      <span className="font-bold">{formatCurrency(amt)}</span>
                                  </div>
                                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-blue-500 h-full transition-all duration-500" 
                                        style={{ width: reportStats.totalExpenses > 0 ? `${(amt / reportStats.totalExpenses) * 100}%` : '0%' }}
                                      />
                                  </div>
                              </div>
                          ))}
                          {reportStats.totalExpenses === 0 && <p className="text-center py-10 text-gray-400 italic text-sm">No expenses for this month.</p>}
                      </div>
                  </Card>

                  <Card>
                      <h3 className="font-bold text-gray-800 mb-4">Financial Health Tip</h3>
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-4">
                          <Zap className="text-blue-600 shrink-0" size={32} />
                          <div>
                              <p className="text-sm text-blue-800 leading-relaxed font-medium">
                                  Keep your expenses below 70% of your total collected revenue for a sustainable business model.
                                  Ensure all teacher salaries are logged before generating the final report.
                              </p>
                          </div>
                      </div>
                  </Card>
              </div>
          </div>
      )}

      {/* Add Teacher Modal */}
      <Modal isOpen={showAddTeacher} onClose={() => { setShowAddTeacher(false); setEditingTeacher(null); }} title={editingTeacher ? "Edit Teacher Profile" : "New Teacher Profile"}>
          <div className="space-y-4">
              <Input label="Teacher Full Name" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} />
              <Input label="Mobile Number" type="tel" value={teacherForm.mobile} onChange={e => setTeacherForm({...teacherForm, mobile: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                  <Input label="Monthly Salary (₹)" type="number" value={teacherForm.salaryAmount} onChange={e => setTeacherForm({...teacherForm, salaryAmount: Number(e.target.value)})} />
                  <Input label="Joining Date" type="date" value={teacherForm.joiningDate} onChange={e => setTeacherForm({...teacherForm, joiningDate: e.target.value})} />
              </div>
              <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 font-bold" onClick={handleSaveTeacher}>
                  <Save size={18} /> {editingTeacher ? 'Update Profile' : 'Save Profile'}
              </Button>
          </div>
      </Modal>

      {/* Add Expense Modal */}
      <Modal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)} title="Log New Expense">
          <div className="space-y-4">
              <Select 
                label="Expense Category" 
                value={expenseForm.category} 
                onChange={e => setExpenseForm({...expenseForm, category: e.target.value as any})}
                options={CATEGORIES}
              />
              
              {expenseForm.category === 'Salary' && (
                  <Select 
                    label="Select Teacher"
                    value={expenseForm.teacherId?.toString() || ''}
                    onChange={e => {
                        const tId = Number(e.target.value);
                        const t = teachers.find(t => t.id === tId);
                        setExpenseForm({...expenseForm, teacherId: tId, amount: t?.salaryAmount || 0, description: `Salary payment for ${t?.name}`});
                    }}
                    options={[
                        { value: '', label: 'Select Staff member' },
                        ...teachers.map(t => ({ value: t.id!.toString(), label: t.name }))
                    ]}
                  />
              )}

              <Input label="Amount (₹)" type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})} />
              <Input label="Transaction Date" type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
              <Input label="Short Description" placeholder="Ex: Paid via Cash / Receipt #123" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} />
              
              <div className="pt-4">
                  <Button className="w-full bg-red-600 hover:bg-red-700 font-bold shadow-lg" onClick={handleSaveExpense}>
                      <IndianRupee size={18} /> Confirm Payment Entry
                  </Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default ExpenseManagement;

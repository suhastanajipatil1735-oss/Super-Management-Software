
import React, { useState, useEffect } from 'react';
import { UserProfile, Student, ReceiptLog } from '../types';
import { db } from '../services/db';
import { Card, Button, Input, Select, Modal } from '../components/UI';
import { LABELS } from '../constants';
import { openWhatsApp, formatCurrency } from '../services/whatsapp';
import { ArrowLeft, Search, FileText, Download, Send, History, CheckCircle, ReceiptText } from 'lucide-react';
import jsPDF from 'jspdf';

interface FeesReceiptsProps {
  user: UserProfile;
  lang: 'en' | 'mr';
  onBack: () => void;
}

const FeesReceipts: React.FC<FeesReceiptsProps> = ({ user, lang, onBack }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [receiptLogs, setReceiptLogs] = useState<ReceiptLog[]>([]);
  
  // Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online'>('Cash');
  const [isProcessing, setIsProcessing] = useState(false);

  const labels = LABELS[lang];
  const isOwner = user.role === 'owner';
  
  useEffect(() => {
    loadData();
    loadHistory();
  }, [user.mobile, selectedClass]);

  const loadData = async () => {
    if (!user.mobile) return;
    
    let collection = db.students.where('ownerMobile').equals(user.mobile);
    const data = await collection.toArray();
    let filtered = data;

    if (selectedClass !== 'ALL') {
        filtered = filtered.filter(s => s.classGrade === selectedClass);
    }
    
    setStudents(filtered);
  };

  const loadHistory = async () => {
      const logs = await db.receiptLogs.where('ownerMobile').equals(user.mobile).reverse().sortBy('date');
      setReceiptLogs(logs);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.mobile.includes(searchTerm)
  );

  const openPaymentModal = (student: Student) => {
      setSelectedStudent(student);
      setPayAmount('');
      setShowPayModal(true);
  };

  const generatePDF = (log: ReceiptLog, student: Student) => {
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(30, 41, 59); // Navy Blue (#1e293b)
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(user.instituteName.toUpperCase(), 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("OFFICIAL PAYMENT RECEIPT", 105, 28, { align: 'center' });
      doc.text(`Mobile: +91 ${user.mobile} ${user.email ? `| Email: ${user.email}` : ''}`, 105, 34, { align: 'center' });
      if(user.address) doc.text(user.address, 105, 40, { align: 'center' });

      // Receipt Metadata
      doc.setTextColor(45, 55, 72);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Receipt No: #${log.receiptNo}`, 20, 55);
      doc.text(`Date: ${new Date(log.date).toLocaleDateString('en-IN')}`, 190, 55, { align: 'right' });

      // Student Details Box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(15, 60, 180, 35, 'FD');

      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("STUDENT DETAILS", 20, 68);
      doc.setLineWidth(0.1);
      doc.line(20, 70, 60, 70);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Name: ${student.name}`, 20, 78);
      doc.text(`Class: ${student.classGrade}`, 20, 84);
      doc.text(`Roll No: ${student.rollNo || 'N/A'}`, 120, 78);
      doc.text(`Mobile: ${student.mobile}`, 120, 84);

      // Status Summary Table (The "Status" the user requested)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("FEES STATUS SUMMARY", 105, 110, { align: 'center' });
      
      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(15, 115, 180, 10, 'F');
      doc.setFontSize(10);
      doc.text("Description", 20, 121);
      doc.text("Amount (INR)", 185, 121, { align: 'right' });

      // Table Rows
      const tableStartY = 132;
      doc.setFont("helvetica", "normal");
      
      // Row 1: Total Fees
      doc.text("Total Academic Fees", 20, tableStartY);
      doc.text(`${formatCurrency(student.feesTotal)}`, 185, tableStartY, { align: 'right' });
      doc.line(15, tableStartY + 4, 195, tableStartY + 4);

      // Row 2: Paid So Far
      doc.text("Total Fees Paid (including current)", 20, tableStartY + 10);
      doc.setTextColor(56, 161, 105); // Success green
      doc.text(`${formatCurrency(student.feesPaid)}`, 185, tableStartY + 10, { align: 'right' });
      doc.setTextColor(30, 41, 59);
      doc.line(15, tableStartY + 14, 195, tableStartY + 14);

      // Row 3: Current Payment
      doc.setFont("helvetica", "bold");
      doc.text("Current Payment Amount", 20, tableStartY + 20);
      doc.text(`${formatCurrency(log.amount)}`, 185, tableStartY + 20, { align: 'right' });
      doc.setFont("helvetica", "normal");
      doc.line(15, tableStartY + 24, 195, tableStartY + 24);

      // Row 4: Balance Due
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const balance = student.feesTotal - student.feesPaid;
      doc.text("BALANCE DUE", 20, tableStartY + 35);
      doc.setTextColor(229, 62, 62); // Danger red
      doc.text(`${formatCurrency(balance)}`, 185, tableStartY + 35, { align: 'right' });

      // Payment Method Info
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text(`Payment Mode: ${log.paymentMode}`, 20, tableStartY + 45);

      // Footer
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      doc.line(20, 230, 70, 230);
      doc.text("Receiver's Signature", 45, 236, { align: 'center' });

      doc.line(140, 230, 190, 230);
      doc.text("Authorized Signature", 165, 236, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("This is a system generated document and does not require a physical signature.", 105, 275, { align: 'center' });
      doc.text(`Powered by Super Management - generated on ${new Date().toLocaleString()}`, 105, 280, { align: 'center' });

      doc.save(`${student.name.replace(/\s+/g, '_')}_Status_Receipt.pdf`);
  };

  const handleGenerateReceipt = async () => {
      if (!selectedStudent || !payAmount) return;
      const amount = parseInt(payAmount);
      if (isNaN(amount) || amount < 0) {
          alert("Invalid Amount");
          return;
      }
      
      const pendingFees = selectedStudent.feesTotal - selectedStudent.feesPaid;
      if (amount > pendingFees) {
          alert(`Amount exceeds pending fees (₹${pendingFees})`);
          return;
      }

      setIsProcessing(true);

      // 1. Create Receipt Log
      const receiptNo = `REC${Date.now().toString().slice(-6)}`;
      const log: ReceiptLog = {
          ownerMobile: user.mobile,
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          amount: amount,
          date: new Date().toISOString(),
          receiptNo: receiptNo,
          paymentMode: paymentMode
      };
      
      await db.receiptLogs.add(log);

      // 2. Update Student Fees
      const updatedPaid = selectedStudent.feesPaid + amount;
      await db.students.update(selectedStudent.id, { feesPaid: updatedPaid });
      
      // Update local student object for PDF generation accuracy
      const updatedStudent = { ...selectedStudent, feesPaid: updatedPaid };

      // 3. Generate PDF (Downloads automatically)
      generatePDF(log, updatedStudent);

      // 4. Open WhatsApp
      const msg = `Dear Parent,\n\nFees payment of Rs.${amount} for ${selectedStudent.name} is received.\n\n*Current Status:*\nTotal: ₹${updatedStudent.feesTotal}\nPaid: ₹${updatedStudent.feesPaid}\n*Due: ₹${updatedStudent.feesTotal - updatedStudent.feesPaid}*\n\nRegards,\n${user.instituteName}`;
      
      setTimeout(() => {
          openWhatsApp(selectedStudent.mobile, msg);
          setIsProcessing(false);
          setShowPayModal(false);
          loadData(); 
          loadHistory(); 
      }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold">Fees & Receipts</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
           <div className="w-full md:w-1/3">
              <Select 
                 options={[
                     {value: 'ALL', label: 'All Classes'},
                     ...Array.from({length: 12}, (_, i) => ({ value: (i+1).toString(), label: `Class ${i+1}` }))
                 ]}
                 value={selectedClass}
                 onChange={(e) => setSelectedClass(e.target.value)}
                 className="bg-gray-50 border-gray-200"
              />
           </div>
           <div className="w-full md:w-2/3 relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input 
                   type="text" 
                   placeholder="Search Student..." 
                   className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-100"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
               />
           </div>
      </div>

      {/* Student List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map(student => {
              const pending = student.feesTotal - student.feesPaid;
              return (
                  <Card key={student.id} className="relative group hover:shadow-lg transition-all border-l-4 border-l-teal-500">
                      <div className="flex justify-between items-start mb-3">
                          <div>
                              <h4 className="font-bold text-gray-800">{student.name}</h4>
                              <p className="text-xs text-gray-500">Class: {student.classGrade} | Roll: {student.rollNo || '-'}</p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${pending > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                              {pending > 0 ? 'Pending' : 'Fully Paid'}
                          </span>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
                          <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Total Academic Fees</span>
                              <span className="font-medium">₹{student.feesTotal}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Paid Amount</span>
                              <span className="font-medium text-green-600">₹{student.feesPaid}</span>
                          </div>
                          <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                              <span className="text-gray-800 font-bold">Balance Due</span>
                              <span className="font-bold text-red-500">₹{pending}</span>
                          </div>
                      </div>

                      <Button 
                        className="w-full bg-[#1e293b] hover:bg-black" 
                        size="sm"
                        onClick={() => openPaymentModal(student)}
                      >
                          <ReceiptText size={16} /> Pay & Get Status Receipt
                      </Button>
                  </Card>
              );
          })}
          {filteredStudents.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
                  <Search size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No matching students found.</p>
              </div>
          )}
      </div>

      {/* History Log */}
      <div className="mt-8">
          <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
              <History size={20} className="text-teal-600" /> Transaction History
          </h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Date</th>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Receipt No</th>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Student</th>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Amount Paid</th>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-sm">
                          {receiptLogs.map(log => (
                              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-3 text-gray-600">{new Date(log.date).toLocaleDateString()}</td>
                                  <td className="px-6 py-3 font-mono text-gray-500 text-xs">{log.receiptNo}</td>
                                  <td className="px-6 py-3 font-medium text-gray-800">{log.studentName}</td>
                                  <td className="px-6 py-3 font-bold text-green-600">₹{log.amount}</td>
                                  <td className="px-6 py-3 text-right">
                                      <button 
                                        className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center justify-end gap-1 ml-auto"
                                        onClick={async () => {
                                            const s = await db.students.get(log.studentId);
                                            if (s) generatePDF(log, s);
                                        }}
                                      >
                                          <Download size={14} /> Download PDF
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {receiptLogs.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="text-center py-10 text-gray-400 italic">No payment history available.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* Payment Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Generate Status Receipt">
          {selectedStudent && (
              <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-2">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-slate-900 font-bold">{selectedStudent.name}</p>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 uppercase">Class {selectedStudent.classGrade}</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-slate-500">Total Fees:</span> <span className="font-bold">₹{selectedStudent.feesTotal}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Current Paid:</span> <span className="font-bold text-green-600">₹{selectedStudent.feesPaid}</span></div>
                        <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 font-bold">
                          <span className="text-slate-700">Net Balance:</span> 
                          <span className="text-red-500 text-sm">₹{selectedStudent.feesTotal - selectedStudent.feesPaid}</span>
                        </div>
                      </div>
                  </div>
                  
                  <Input 
                      label="Payment Amount (₹)"
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0 for balance check only"
                      autoFocus
                  />
                  
                  <Select 
                      label="Payment Method"
                      options={[{value: 'Cash', label: 'Cash Payment'}, {value: 'Online', label: 'Online / UPI'}]}
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                  />

                  <div className="pt-4 space-y-3">
                      <Button className="w-full bg-teal-600 hover:bg-teal-700 h-12 text-white" onClick={handleGenerateReceipt} disabled={isProcessing}>
                          {isProcessing ? 'Processing...' : (
                              <>
                                <Download size={18} /> Process Payment & Get PDF
                              </>
                          )}
                      </Button>
                      <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                          This receipt will include a complete statement of account (Total, Paid, and Balance).
                      </p>
                  </div>
              </div>
          )}
      </Modal>
    </div>
  );
};

export default FeesReceipts;

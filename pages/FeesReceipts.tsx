import React, { useState, useEffect } from 'react';
import { UserProfile, Student, ReceiptLog } from '../types';
import { db } from '../services/db';
import { Card, Button, Input, Select, Modal } from '../components/UI';
import { LABELS } from '../constants';
import { openWhatsApp, formatCurrency } from '../services/whatsapp';
import { ArrowLeft, Search, FileText, Download, Send, History, CheckCircle } from 'lucide-react';
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
    
    // Dexie filtering
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
      doc.setFillColor(45, 55, 72); // Navy Blue
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(user.instituteName, 105, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.text("Mobile: " + user.mobile, 105, 26, { align: 'center' });
      if(user.address) doc.text(user.address, 105, 32, { align: 'center' });

      // Title
      doc.setTextColor(45, 55, 72);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("FEES RECEIPT", 105, 55, { align: 'center' });

      // Details Box
      doc.setDrawColor(200, 200, 200);
      doc.rect(15, 65, 180, 50);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      
      const leftX = 20;
      const rightX = 120;
      const startY = 75;
      const gap = 10;

      // Row 1
      doc.text(`Receipt No: #${log.receiptNo}`, leftX, startY);
      doc.text(`Date: ${new Date(log.date).toLocaleDateString()}`, rightX, startY);

      // Row 2
      doc.text(`Student Name: ${student.name}`, leftX, startY + gap);
      doc.text(`Class: ${student.classGrade}`, rightX, startY + gap);

      // Row 3
      doc.text(`Roll No: ${student.rollNo || 'N/A'}`, leftX, startY + gap * 2);
      doc.text(`Mobile: ${student.mobile}`, rightX, startY + gap * 2);

      // Payment Details
      doc.setFillColor(240, 244, 248);
      doc.rect(15, 125, 180, 25, 'F');
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Amount Paid:", 20, 142);
      doc.text(`Rs. ${log.amount}/-`, 180, 142, { align: 'right' });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Payment Mode: ${log.paymentMode}`, 20, 155);
      
      // Footer
      doc.setLineWidth(0.5);
      doc.line(15, 200, 80, 200);
      doc.text("Student/Parent Signature", 15, 205);

      doc.line(130, 200, 195, 200);
      doc.text("Authorized Signature", 130, 205);

      doc.setFontSize(8);
      doc.text("This is a computer generated receipt.", 105, 280, { align: 'center' });

      doc.save(`${student.name.replace(' ', '_')}_Receipt_${log.receiptNo}.pdf`);
  };

  const handleGenerateReceipt = async () => {
      if (!selectedStudent || !payAmount) return;
      const amount = parseInt(payAmount);
      if (isNaN(amount) || amount <= 0) {
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

      // 3. Generate PDF (Downloads automatically)
      generatePDF(log, selectedStudent);

      // 4. Open WhatsApp
      const msg = `Dear Parent,\n\nFees payment of Rs.${amount} for ${selectedStudent.name} is successful.\nReceipt No: ${receiptNo}\nDate: ${new Date().toLocaleDateString()}\n\nPlease find the receipt attached (Select the downloaded PDF file).\n\nRegards,\n${user.instituteName}`;
      
      // We give a small delay to allow PDF download to start
      setTimeout(() => {
          openWhatsApp(selectedStudent.mobile, msg);
          setIsProcessing(false);
          setShowPayModal(false);
          loadData(); // Refresh list
          loadHistory(); // Refresh logs
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
                  <Card key={student.id} className="relative group hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start mb-3">
                          <div>
                              <h4 className="font-bold text-gray-800">{student.name}</h4>
                              <p className="text-xs text-gray-500">Class: {student.classGrade} | Roll: {student.rollNo || '-'}</p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${pending > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                              {pending > 0 ? 'Pending' : 'Paid'}
                          </span>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-500">Total</span>
                              <span className="font-medium">₹{student.feesTotal}</span>
                          </div>
                          <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-500">Paid</span>
                              <span className="font-medium text-green-600">₹{student.feesPaid}</span>
                          </div>
                          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm">
                              <span className="text-gray-600 font-bold">Due</span>
                              <span className="font-bold text-red-500">₹{pending}</span>
                          </div>
                      </div>

                      <Button 
                        disabled={pending <= 0} 
                        className="w-full" 
                        size="sm"
                        onClick={() => openPaymentModal(student)}
                      >
                          <FileText size={16} /> Pay & Generate Receipt
                      </Button>
                  </Card>
              );
          })}
          {filteredStudents.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-400">
                  No students found.
              </div>
          )}
      </div>

      {/* History Log */}
      <div className="mt-8">
          <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
              <History size={20} /> Sent Receipts History
          </h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Date</th>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Receipt No</th>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Student</th>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Amount</th>
                              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-sm">
                          {receiptLogs.map(log => (
                              <tr key={log.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-3 text-gray-600">{new Date(log.date).toLocaleDateString()}</td>
                                  <td className="px-6 py-3 font-mono text-gray-500">{log.receiptNo}</td>
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
                                  <td colSpan={5} className="text-center py-6 text-gray-400">No receipts generated yet.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* Payment Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Generate Receipt">
          {selectedStudent && (
              <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                      <p className="text-sm text-blue-800 font-bold">{selectedStudent.name}</p>
                      <p className="text-xs text-blue-600">Pending Amount: ₹{selectedStudent.feesTotal - selectedStudent.feesPaid}</p>
                  </div>
                  
                  <Input 
                      label="Amount to Pay (₹)"
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="Enter amount"
                      autoFocus
                  />
                  
                  <Select 
                      label="Payment Mode"
                      options={[{value: 'Cash', label: 'Cash'}, {value: 'Online', label: 'Online (UPI/Bank)'}]}
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                  />

                  <div className="pt-4">
                      <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleGenerateReceipt} disabled={isProcessing}>
                          {isProcessing ? 'Generating...' : (
                              <>
                                <Send size={18} /> Generate PDF & Send WhatsApp
                              </>
                          )}
                      </Button>
                      <p className="text-[10px] text-gray-400 text-center mt-2">
                          Note: This will download the receipt PDF. Please attach it in WhatsApp manually.
                      </p>
                  </div>
              </div>
          )}
      </Modal>
    </div>
  );
};

export default FeesReceipts;
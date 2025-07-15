export const payrollData = [
  {
    firmId: 1,
    firmName: 'Tech Solutions Inc.',
    paid: 42,
    pending: 15,
    generated: 10,
    total: 67,
    amount: 2850000
  },
  {
    firmId: 2,
    firmName: 'Global Finance',
    paid: 35,
    pending: 8,
    generated: 10,
    total: 53,
    amount: 2150000
  },
  {
    firmId: 3,
    firmName: 'Creative Designs',
    paid: 28,
    pending: 12,
    generated: 10,
    total: 50,
    amount: 2000000
  },
  {
    firmId: 4,
    firmName: 'Logistics Pro',
    paid: 50,
    pending: 10,
    generated: 10,
    total: 70,
    amount: 3000000
  },
  {
    firmId: 5,
    firmName: 'HealthCare Plus',
    paid: 65,
    pending: 5,
    generated: 10,
    total: 80,
    amount: 3500000
  },
  {
    firmId: 6,
    firmName: 'EduTech Solutions',
    paid: 30,
    pending: 20,
    generated: 10,
    total: 60,
    amount: 2500000
  }
];

export const overview = {
  totalEmployees: 320,
  payRoll: 17000000,
  pending: 70,
  paid: 250,
}

export const payrollEmployees = [
  {
    _id: '1',
    code: 'EMP001',
    firm: 'ABC Company',
    name: 'Sarah Johnson',
    position: 'Senior Software Engineer',
    email: 'sarah.johnson@company.com',
    phone: '(555) 123-4567',
    bankAccount: '**** **** **** 1234',
    salaryMonth: '2025-01',
    payrollDate: new Date('2025-01-01'),
    salaryPaidAt: new Date('2025-01-15'),
    salaryDays: 22,
    workingDaysCounted: 21,
    carryForward: {
      pendingSalary: 0,
      unpaidExpenses: 500,
      remarks: 'Travel expenses pending'
    },
    salaryDetails: {
      baseSalary: 125000,
      bonuses: [
        { name: 'Performance Bonus', amount: 5000 },
        { name: 'Project Completion', amount: 2000 }
      ],
      deductions: [
        { name: 'Income Tax', type: 'percentage', value: 20, isActive: true },
        { name: 'Health Insurance', type: 'fixed', value: 500, isActive: true },
        { name: 'Provident Fund', type: 'percentage', value: 12, isActive: true }
      ],
      increments: [
        {
          name: 'Annual Increment',
          amount: 10000,
          type: 'permanent',
          effectiveFrom: new Date('2025-01-01'),
          approvedBy: 'HR001'
        }
      ],
      other: [
        { name: 'Internet Allowance', type: 'addition', amount: 1000 },
        { name: 'Late Fine', type: 'deduction', amount: 200 }
      ],
      reimbursedExpenses: 1500
    },
    calculatedSalary: 119318,
    grossPay: 133500,
    totalDeductions: 25682,
    netPayable: 107818,
    status: 'Paid',
    createdBy: 'HR001',
    remarks: 'Regular payroll processing',
    payslipUrl: '/payslips/EMP001_2025_01.pdf'
  },
  {
    _id: '2',
    code: 'EMP002',
    firm: 'ABC Company',
    name: 'Michael Chen',
    position: 'Frontend Developer',
    email: 'michael.chen@company.com',
    phone: '(555) 234-5678',
    bankAccount: '**** **** **** 2345',
    salaryMonth: '2025-01',
    payrollDate: new Date('2025-01-01'),
    salaryDays: 22,
    workingDaysCounted: 20,
    carryForward: {
      pendingSalary: 2000,
      unpaidExpenses: 0,
      remarks: 'Previous month overtime pending'
    },
    salaryDetails: {
      baseSalary: 95000,
      bonuses: [
        { name: 'Code Quality Bonus', amount: 1500 }
      ],
      deductions: [
        { name: 'Income Tax', type: 'percentage', value: 18, isActive: true },
        { name: 'Health Insurance', type: 'fixed', value: 500, isActive: true },
        { name: 'Provident Fund', type: 'percentage', value: 12, isActive: true }
      ],
      increments: [],
      other: [
        { name: 'Transport Allowance', type: 'addition', amount: 800 }
      ],
      reimbursedExpenses: 750
    },
    calculatedSalary: 86364,
    grossPay: 100050,
    totalDeductions: 18909,
    netPayable: 81141,
    status: 'Pending',
    createdBy: 'HR001',
    remarks: 'Awaiting bank verification'
  },
  {
    _id: '3',
    code: 'EMP003',
    firm: 'ABC Company',
    name: 'Emily Rodriguez',
    position: 'Marketing Manager',
    email: 'emily.rodriguez@company.com',
    phone: '(555) 345-6789',
    bankAccount: '**** **** **** 3456',
    salaryMonth: '2025-01',
    payrollDate: new Date('2025-01-01'),
    salaryPaidAt: new Date('2025-01-15'),
    salaryDays: 22,
    workingDaysCounted: 22,
    carryForward: {
      pendingSalary: 0,
      unpaidExpenses: 1200,
      remarks: 'Marketing campaign expenses'
    },
    salaryDetails: {
      baseSalary: 85000,
      bonuses: [
        { name: 'Campaign Success Bonus', amount: 3000 },
        { name: 'Lead Generation Bonus', amount: 1000 }
      ],
      deductions: [
        { name: 'Income Tax', type: 'percentage', value: 15, isActive: true },
        { name: 'Health Insurance', type: 'fixed', value: 500, isActive: true },
        { name: 'Provident Fund', type: 'percentage', value: 12, isActive: true }
      ],
      increments: [],
      other: [
        { name: 'Marketing Allowance', type: 'addition', amount: 1500 }
      ],
      reimbursedExpenses: 2200
    },
    calculatedSalary: 85000,
    grossPay: 92700,
    totalDeductions: 16405,
    netPayable: 76295,
    status: 'Paid',
    createdBy: 'HR001',
    remarks: 'Regular payroll processing'
  },
  {
    _id: '4',
    code: 'EMP004',
    firm: 'ABC Company',
    name: 'David Thompson',
    position: 'Sales Director',
    email: 'david.thompson@company.com',
    phone: '(555) 456-7890',
    bankAccount: '**** **** **** 4567',
    salaryMonth: '2025-01',
    payrollDate: new Date('2025-01-01'),
    salaryDays: 22,
    workingDaysCounted: 21,
    carryForward: {
      pendingSalary: 0,
      unpaidExpenses: 800,
      remarks: 'Client meeting expenses'
    },
    salaryDetails: {
      baseSalary: 110000,
      bonuses: [
        { name: 'Sales Target Achievement', amount: 8000 },
        { name: 'New Client Acquisition', amount: 3000 }
      ],
      deductions: [
        { name: 'Income Tax', type: 'percentage', value: 22, isActive: true },
        { name: 'Health Insurance', type: 'fixed', value: 500, isActive: true },
        { name: 'Provident Fund', type: 'percentage', value: 12, isActive: true }
      ],
      increments: [
        {
          name: 'Performance Increment',
          amount: 5000,
          type: 'permanent',
          effectiveFrom: new Date('2025-01-01'),
          approvedBy: 'CEO001'
        }
      ],
      other: [
        { name: 'Sales Commission', type: 'addition', amount: 2500 }
      ],
      reimbursedExpenses: 1800
    },
    calculatedSalary: 105000,
    grossPay: 126300,
    totalDeductions: 28386,
    netPayable: 97914,
    status: 'Generated',
    createdBy: 'HR001',
    remarks: 'Pending approval from finance'
  },
  {
    _id: '5',
    code: 'EMP005',
    firm: 'ABC Company',
    name: 'Jessica Williams',
    position: 'Financial Analyst',
    email: 'jessica.williams@company.com',
    phone: '(555) 567-8901',
    bankAccount: '**** **** **** 5678',
    salaryMonth: '2025-01',
    payrollDate: new Date('2025-01-01'),
    salaryPaidAt: new Date('2025-01-15'),
    salaryDays: 22,
    workingDaysCounted: 22,
    carryForward: {
      pendingSalary: 0,
      unpaidExpenses: 300,
      remarks: 'Office supplies'
    },
    salaryDetails: {
      baseSalary: 75000,
      bonuses: [
        { name: 'Accuracy Bonus', amount: 1000 }
      ],
      deductions: [
        { name: 'Income Tax', type: 'percentage', value: 12, isActive: true },
        { name: 'Health Insurance', type: 'fixed', value: 500, isActive: true },
        { name: 'Provident Fund', type: 'percentage', value: 12, isActive: true }
      ],
      increments: [],
      other: [
        { name: 'Professional Development', type: 'addition', amount: 500 }
      ],
      reimbursedExpenses: 800
    },
    calculatedSalary: 75000,
    grossPay: 77300,
    totalDeductions: 14276,
    netPayable: 63024,
    status: 'Paid',
    createdBy: 'HR001',
    remarks: 'Regular payroll processing'
  },
  {
    _id: '6',
    code: 'EMP006',
    firm: 'ABC Company',
    name: 'Robert Martinez',
    position: 'DevOps Engineer',
    email: 'robert.martinez@company.com',
    phone: '(555) 678-9012',
    bankAccount: '**** **** **** 6789',
    salaryMonth: '2025-01',
    payrollDate: new Date('2025-01-01'),
    salaryDays: 22,
    workingDaysCounted: 19,
    carryForward: {
      pendingSalary: 1500,
      unpaidExpenses: 0,
      remarks: 'Previous month on-call bonus'
    },
    salaryDetails: {
      baseSalary: 105000,
      bonuses: [
        { name: 'Infrastructure Stability', amount: 2500 },
        { name: 'On-call Bonus', amount: 1500 }
      ],
      deductions: [
        { name: 'Income Tax', type: 'percentage', value: 20, isActive: true },
        { name: 'Health Insurance', type: 'fixed', value: 500, isActive: true },
        { name: 'Provident Fund', type: 'percentage', value: 12, isActive: true },
        { name: 'Meal Deduction', type: 'fixed', value: 300, isActive: true }
      ],
      increments: [],
      other: [
        { name: 'Tech Allowance', type: 'addition', amount: 1200 }
      ],
      reimbursedExpenses: 600
    },
    calculatedSalary: 90682,
    grossPay: 111800,
    totalDeductions: 22976,
    netPayable: 88824,
    status: 'Pending',
    createdBy: 'HR001',
    remarks: 'Attendance verification pending'
  },
  {
    _id: '7',
    code: 'EMP006',
    firm: 'ABC Company',
    name: 'Robert Martinez',
    position: 'DevOps Engineer',
    email: 'robert.martinez@company.com',
    phone: '(555) 678-9012',
    bankAccount: '**** **** **** 6789',
    salaryMonth: '2025-01',
    payrollDate: new Date('2025-01-01'),
    salaryDays: 22,
    workingDaysCounted: 19,
    carryForward: {
      pendingSalary: 1500,
      unpaidExpenses: 0,
      remarks: 'Previous month on-call bonus'
    },
    salaryDetails: {
      baseSalary: 105000,
      bonuses: [
        { name: 'Infrastructure Stability', amount: 2500 },
        { name: 'On-call Bonus', amount: 1500 }
      ],
      deductions: [
        { name: 'Income Tax', type: 'percentage', value: 20, isActive: true },
        { name: 'Health Insurance', type: 'fixed', value: 500, isActive: true },
        { name: 'Provident Fund', type: 'percentage', value: 12, isActive: true },
        { name: 'Meal Deduction', type: 'fixed', value: 300, isActive: true }
      ],
      increments: [],
      other: [
        { name: 'Tech Allowance', type: 'addition', amount: 1200 }
      ],
      reimbursedExpenses: 600
    },
    calculatedSalary: 90682,
    grossPay: 111800,
    totalDeductions: 22976,
    netPayable: 88824,
    status: 'Pending',
    createdBy: 'HR001',
    remarks: 'Attendance verification pending'
  }
];
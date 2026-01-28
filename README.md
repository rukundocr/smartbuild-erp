# SmartBuild | Construction ERP 🏗️

SmartBuild is a robust, dark-themed Enterprise Resource Planning (ERP) system designed specifically for the construction industry. It streamlines financial tracking, project management, and tax compliance.

## 🚀 Core Features

### 📊 Business Intelligence
* **Interactive Dashboard:** High-level summary of total borrowed funds, payments made, and remaining liquidity.
* **Smart Insights:** (Ready for Gemini AI integration) to provide predictive financial health checks.

### 👷 Operations Management
* **Project Tracking:** Manage multiple construction sites and budgets.
* **Daily Expenses:** Log every RWF spent on-site with project-specific categorization.
* **Proforma Invoices:** Generate professional quotes for clients.

### 🇷🇼 RRA Compliance
* **Purchases & Sales:** Track VAT-inclusive transactions.
* **VAT Summary:** Automated reporting to simplify Rwanda Revenue Authority filings.

### 🛡️ Internal Control
* **Loan Management:** * Track principal amounts and repayment history.
    * Edit loan parameters (lender, amount, status).
    * Visual progress bars for debt clearance.
    * **PDF Export:** Generate professional loan statements and summary reports using `jsPDF`.
* **Audit Logs:** Full traceability of every action (CREATE, UPDATE, DELETE) with CSV export functionality.

## 🛠️ Tech Stack
* **Backend:** Node.js, Express.js
* **Database:** MongoDB (Mongoose ODM)
* **Frontend:** Handlebars (HBS), Bootstrap 5 (Custom Dark Theme)
* **PDF Engine:** jsPDF & jspdf-autotable
* **Logging:** Custom Winston-based audit logger

## ⚙️ Installation

1. **Clone the repo:**
   ```bash
   git clone [https://github.com/your-username/smartbuild-erp.git](https://github.com/your-username/smartbuild-erp.git)
   cd smartbuild-erp

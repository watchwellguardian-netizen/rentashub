# Workflow Guide Matrix

The `/workflows` route is read-only and does not create transactions.

| Workflow | Actors | Evidence status |
| --- | --- | --- |
| Rental | Customer, Supplier, Admin | Simulated |
| Purchase | Buyer, Supplier, Admin | Partial |
| Sale | Supplier, Buyer, Admin | Partial |
| Trade | Customer, Supplier, Broker | Simulated |
| Swap | Customer, Supplier | Specified Only |
| Brokerage | Broker, Customer, Supplier, Admin | Partial |
| Booking | Customer, Supplier, Admin | Partial |
| Inspection | Customer, Supplier, Inspector, Admin | Simulated |
| Review | Customer, Supplier, Admin | Partial |
| Dispute | Customer, Supplier, Admin | Simulated |

Every workflow includes actors, stages, allowed transitions, cancellation/failure paths, permissions, current implementation status, and `createsTransactions: false`.

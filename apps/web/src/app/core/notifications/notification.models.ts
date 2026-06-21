export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_VALIDATED'
  | 'ORDER_REJECTED'
  | 'ORDER_DELIVERED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  orderId: string | null;
  read: boolean;
  createdAt: string;
}

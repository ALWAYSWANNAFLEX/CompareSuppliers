export interface NotificationProps {
  type: 'success' | 'error';
  text: string;
  onClose: () => void;
}

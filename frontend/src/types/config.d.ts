export {};

declare global {
  type AlertType = 'error' | 'warning' | 'info' | 'success';

  interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    error: string;
  }

  interface ResponseTableData<T> {
    totalCount: number;
    items: Array<T>;
  }

  interface ResponseCreate {
    id: string;
  }

  interface CommonAlertProps {
    alertTxt: string;
    alertType: AlertType;
  }

  interface AmplifyConfigType {
    aws_project_region: string;
    version: string;
  }
}

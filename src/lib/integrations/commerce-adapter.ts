export interface ListParams {
  since?: string; 
  page?: number;
  pageSize?: number;
}

export type TrackingPayload = {
  trackingNumber: string;
  carrier: string;
  status?: string;
  note?: string;
};

export interface CommerceAdapter {
  listOrders(params?: ListParams): Promise<any[]>;
  listCustomers(params?: ListParams): Promise<any[]>;
  listProducts(params?: ListParams): Promise<any[]>;
  createOrUpdateProduct(input: any): Promise<any>;
  setOrderTracking(externalOrderId: string, tracking: TrackingPayload): Promise<void>;
  verifyWebhook(headers: Record<string, string>, bodyRaw: string): boolean;
}
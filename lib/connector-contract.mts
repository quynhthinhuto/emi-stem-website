export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

export type ConnectorFailureStatus =
  | "invalid_request"
  | "request_context_expired"
  | "reauthentication_required"
  | "connector_access_disabled"
  | "tool_not_found"
  | "tool_not_allowed"
  | "rate_limited"
  | "tool_error"
  | "upstream_error"
  | "internal_error"
  | "binding_unavailable";

export type ConnectorContent = {
  content: Array<{ type: string; [key: string]: Json }>;
  structuredContent?: Json;
};

export type ConnectorResult =
  | {
      status: "success";
      result: ConnectorContent;
      requestId?: string;
    }
  | {
      status: ConnectorFailureStatus;
      message: string;
      requestId?: string;
      retryAfterMs?: number;
      result?: ConnectorContent;
    };

export type ConnectorContext =
  | {
      status: "success";
      connectors: Array<{
        connectorId: string;
        policy: "enabled" | "disabled";
        tools: Array<{
          actionName: string;
          description?: string;
          inputSchema: Record<string, Json>;
        }> | null;
      }>;
    }
  | {
      status:
        | "request_context_expired"
        | "internal_error"
        | "binding_unavailable"
        | "upstream_error";
    };

export type ConnectorBinding = {
  invoke(
    connectorId: string,
    actionName: string,
    args: { [key: string]: Json },
  ): Promise<ConnectorResult>;
  getContext?(): Promise<ConnectorContext>;
};

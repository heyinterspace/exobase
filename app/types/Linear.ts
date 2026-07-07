export interface LinearUserResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface LinearConnection {
  user: LinearUserResponse | null;
  token: string;
  teams?: LinearTeam[];

  /**
   * Remembered so issue creation doesn't ask which team every time — see the
   * one-click bar in app/components/chat/LinearAlert.tsx.
   */
  defaultTeamId?: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
}

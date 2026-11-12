import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, List, ListItem, ListItemText, Stack, TextField, Typography,
} from "@mui/material";

const errorMessage = (error, fallback) => error.response?.data?.message || fallback;

export function PasswordAccountSearch({ endpoint, getAuthHeader, onSelect }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const findAccounts = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const { data } = await axios.get(endpoint + "/password-accounts", {
        params: { search: search.trim() }, headers: getAuthHeader(),
      });
      setResults(data);
    } catch (err) {
      setError(errorMessage(err, "Could not find accounts."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ud-filters-card">
      <Stack spacing={2}>
        <div>
          <div className="section-title">Find an account to change its password</div>
          <Typography variant="body2" color="text.secondary">
            Search all login accounts, including those outside the directory table.
          </Typography>
        </div>
        <Stack component="form" onSubmit={findAccounts} direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" label="User name or code" value={search} fullWidth
            onChange={(event) => setSearch(event.target.value)} disabled={loading}
            inputProps={{ maxLength: 100 }} />
          <button className="primary-btn" disabled={loading || search.trim().length < 2}>
            {loading ? "Searching…" : "Find Account"}
          </button>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        {results && (
          results.accounts.length === 0 ? <Typography>No accounts found.</Typography> :
            <List dense disablePadding>
              {results.accounts.map((account) => (
                <ListItem key={account.code} divider disableGutters sx={{ gap: 2 }}>
                  <ListItemText primary={account.name || account.code}
                    secondary={[account.code, account.role?.replace(/_/g, " ")].filter(Boolean).join(" • ")} />
                  {account.role === "super_admin" ?
                    <span className="pill neutral">Password protected</span> :
                    <button className="secondary-btn small" onClick={() => onSelect(account)}>Change Password</button>}
                </ListItem>
              ))}
              {results.hasMore && <ListItem>Refine your search to see more matching accounts.</ListItem>}
            </List>
        )}
      </Stack>
    </div>
  );
}

export function PasswordDialog({ account, endpoint, getAuthHeader, onClose }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState("");
  const accountUrl = endpoint + "/" + encodeURIComponent(account.code);

  useEffect(() => {
    const controller = new AbortController();
    axios.get(accountUrl + "/password-history", {
      headers: getAuthHeader(), signal: controller.signal,
    }).then(({ data }) => {
      setHistory(data.history);
      setHistoryError("");
    }).catch((err) => {
      if (!controller.signal.aborted) setHistoryError(errorMessage(err, "Could not load password history."));
    });
    return () => controller.abort();
  }, [accountUrl, getAuthHeader, saved]);

  const submit = async (event) => {
    event.preventDefault();
    if (busy || saved) return;
    if (password !== confirmation) return setError("The passwords don’t match.");
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      return setError("Use at least 8 characters and no more than 72 bytes.");
    }
    setBusy(true);
    setError("");
    try {
      await axios.patch(accountUrl + "/password", { newPassword: password }, { headers: getAuthHeader() });
      setPassword("");
      setConfirmation("");
      setSaved(true);
      setHistory(null);
    } catch (err) {
      setError(errorMessage(err, "Could not change the password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="xs" aria-labelledby="directory-password-title">
      <form onSubmit={submit}>
        <DialogTitle id="directory-password-title">Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <div>
              <Typography fontWeight={700}>{account.name || account.code}</Typography>
              <Typography variant="body2" color="text.secondary">{account.code}</Typography>
            </div>
            {saved ? <Alert severity="success">Password changed. The change was recorded.</Alert> : <>
              <Typography variant="body2" color="text.secondary">
                Your name and the time of the change will appear in this account’s password history.
              </Typography>
              <TextField autoFocus required label="New password" value={password} disabled={busy}
                type={show ? "text" : "password"} autoComplete="new-password"
                helperText="At least 8 characters, up to 72 bytes."
                onChange={(event) => setPassword(event.target.value)} />
              <TextField required label="Confirm new password" value={confirmation} disabled={busy}
                type={show ? "text" : "password"} autoComplete="new-password"
                onChange={(event) => setConfirmation(event.target.value)} />
              <FormControlLabel label="Show passwords" control={<Checkbox checked={show}
                onChange={(event) => setShow(event.target.checked)} />} />
            </>}
            {error && <Alert severity="error">{error}</Alert>}
            <div>
              <Typography variant="subtitle2" component="h3">Password change history</Typography>
              {historyError ? <Alert severity="warning">{historyError}</Alert> :
                !history ? <Typography variant="body2" role="status">Loading history…</Typography> :
                  history.length === 0 ? <Typography variant="body2">No recorded changes.</Typography> :
                    <List dense sx={{ maxHeight: 180, overflow: "auto" }}>
                      {history.map((entry) => (
                        <ListItem key={entry._id} disableGutters divider>
                          <ListItemText
                            primary={(entry.actor.name || entry.actor.code) + " changed " + (entry.target.name || entry.target.code) + "’s password"}
                            secondary={[entry.actor.code, entry.actor.role?.replace(/_/g, " "), new Date(entry.changedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"].filter(Boolean).join(" • ")} />
                        </ListItem>
                      ))}
                    </List>}
            </div>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>{saved ? "Done" : "Cancel"}</Button>
          {!saved && <Button type="submit" variant="contained" disabled={busy}>{busy ? "Changing…" : "Change Password"}</Button>}
        </DialogActions>
      </form>
    </Dialog>
  );
}

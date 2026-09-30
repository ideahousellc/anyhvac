# Future Buffer adapter boundary

This directory reserves a boundary for a future, separately authorized adapter.
There is no Buffer account, credential, SDK, API request, scheduler, or publishing
behavior in this phase.

A future adapter may accept an already owner-approved campaign payload, map it to
channel-specific fields, return validation errors without publishing, and require
an explicit publication authorization before any external action. Preparation and
approval records must remain separate from delivery credentials and provider code.

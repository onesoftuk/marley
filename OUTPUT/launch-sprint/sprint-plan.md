# Marley Moves — 14-Day Launch Sprint Plan

**Sprint Goal:** Launch first direct-mail campaign with full tracking and iteration capability  
**Duration:** 14 days (2 weeks)  
**Start Date:** [Insert Start Date]  
**Team:** Peter (Product/Ops), Data Team, Sales/Support

---

## Sprint Focus Areas

1. **Data pipeline live** (Days 1-5)
2. **First mail batch** (Days 6-9)
3. **Tracking & response handling** (Days 10-12)
4. **Iterate & optimise** (Days 13-14)

---

## Daily Timeline

### **Day 1 (Monday) — Data Pipeline Setup**

**Owner:** Data Team + Peter

#### Tasks

- [ ] Verify PropertyData API credentials and access
- [ ] Test SSTC data fetch script with live API
- [ ] Validate filter parameters (SP8, bedrooms >= 2, price >= £200k)
- [ ] Run first full export and save to `data/sstc-export-day1.csv`
- [ ] Review data quality (missing fields, duplicates)

#### Success Metrics

- ✅ SSTC export generates >= 10 valid property records
- ✅ All required fields populated (address, price, date sold)
- ✅ No API errors or timeouts

#### Decision Gate (17:00)

- **GO:** Data pipeline working, proceed to Day 2
- **NO-GO:** API issues → escalate to vendor support, retry Day 2 morning

#### Blockers & Fallbacks

- **Blocker:** API credentials invalid
  - **Fallback:** Use sample data from previous exports for testing
- **Blocker:** SSTC data not available in API
  - **Fallback:** Pivot to sold-price data, adjust letter messaging

---

### **Day 2 (Tuesday) — Automation & Scheduling**

**Owner:** Data Team

#### Tasks

- [ ] Set up weekly cron job for SSTC data pull (Mondays 09:00)
- [ ] Create automated deduplication script
- [ ] Load historical contact log (empty for first run)
- [ ] Test dedupe logic with Day 1 export
- [ ] Document runbook for manual override if automation fails

#### Success Metrics

- ✅ Cron job scheduled and tested (dry run)
- ✅ Dedupe script removes duplicates correctly
- ✅ Runbook documented in `OUTPUT/runbook-batch-automation.md`

#### Decision Gate (17:00)

- **GO:** Automation working, proceed to Day 3
- **NO-GO:** Automation issues → plan for manual batch process

#### Blockers & Fallbacks

- **Blocker:** Server access issues for cron setup
  - **Fallback:** Run batch manually each Monday (add to ops calendar)

---

### **Day 3 (Wednesday) — Letter Template Finalisation**

**Owner:** Peter + Sales Team

#### Tasks

- [ ] Review `OUTPUT/direct-mail/letter-template.md`
- [ ] Finalise copy (tone, CTA, branding)
- [ ] Add Marley Moves logo and branding assets
- [ ] Generate test merge (5 sample properties)
- [ ] Print test letters and review quality
- [ ] Get legal/compliance sign-off on copy

#### Success Metrics

- ✅ Letter template approved by all stakeholders
- ✅ Test print quality acceptable (no formatting issues)
- ✅ Compliance approved (GDPR, opt-out language)

#### Decision Gate (17:00)

- **GO:** Template ready for production, proceed to Day 4
- **NO-GO:** Legal issues → revise copy, re-approve next day

#### Blockers & Fallbacks

- **Blocker:** Logo/branding not ready
  - **Fallback:** Use text-only header for first batch, iterate later
- **Blocker:** Legal concerns about messaging
  - **Fallback:** Use conservative “service directory” language

---

### **Day 4 (Thursday) — Tracking System Setup**

**Owner:** Peter + Dev Team

#### Tasks

- [ ] Build ref code generator script (`MM-YYYYMMDD-XXXX`)
- [ ] Create QR code generator (URL with ref code)
- [ ] Set up landing page: `marleymoves.co.uk/contact?ref=MM-XXXXXXXX-XXXX`
- [ ] Configure Google Analytics event tracking for QR scans
- [ ] Create CRM fields for stage tracking (or spreadsheet template)
- [ ] Test end-to-end: QR scan → landing page → form → CRM log

#### Success Metrics

- ✅ Ref code generator working (test 10 codes)
- ✅ QR codes scannable and link to correct URL
- ✅ Landing page live with ref code capture
- ✅ Test form submission logs to CRM/sheet

#### Decision Gate (17:00)

- **GO:** Tracking system ready, proceed to Day 5
- **NO-GO:** Tech issues → use manual phone-only tracking for first batch

#### Blockers & Fallbacks

- **Blocker:** Landing page not ready
  - **Fallback:** Use main website contact form + manual ref code field
- **Blocker:** QR code tool unavailable
  - **Fallback:** Use free online QR generator (qr-code-generator.com)

---

### **Day 5 (Friday) — Pre-Launch Checklist**

**Owner:** Peter (Full Team)

#### Tasks

- [ ] Review all systems: data pull, dedupe, merge, tracking
- [ ] Confirm print vendor ready (or in-house printer stocked)
- [ ] Test full workflow end-to-end with 3 sample properties
- [ ] Create batch manifest template (`OUTPUT/direct-mail/manifest-template.csv`)
- [ ] Schedule team kick-off for Monday (Day 8) batch day
- [ ] Document emergency contacts (vendor support, API support)

#### Success Metrics

- ✅ End-to-end test completed successfully
- ✅ Print vendor confirmed availability
- ✅ All team members briefed on Monday workflow

#### Decision Gate (17:00)

- **GO:** Ready for first batch Monday, proceed to Day 8
- **NO-GO:** Major issue → delay batch by 1 week, use weekend to fix

#### Blockers & Fallbacks

- **Blocker:** Print vendor unavailable
  - **Fallback:** Find backup vendor over weekend or print in-house

---

### **Day 6-7 (Weekend) — Buffer Days**

**Owner:** Peter (as needed)

#### Tasks (Optional)

- [ ] Resolve any Day 5 blockers
- [ ] Review and refine batch-day checklist
- [ ] Prepare Monday morning kick-off deck/notes
- [ ] Rest and prepare for sprint week 2 🚀

---

### **Day 8 (Monday) — First Batch Day! 🎉**

**Owner:** Full Team

#### Tasks (Follow `OUTPUT/direct-mail/batch-sop.md`)

- [ ] 09:00 — Run data pull (target: 20-50 properties)
- [ ] 09:30 — Dedupe against suppression list
- [ ] 10:00 — Merge letters with ref codes + QR codes
- [ ] 12:00 — Review merged PDFs (spot check 5 letters)
- [ ] 14:00 — Print and envelope (in-house or send to vendor)
- [ ] 16:00 — Post batch (Royal Mail or vendor)
- [ ] 17:00 — Update batch manifest with `status=posted`

#### Success Metrics

- ✅ Batch size: 20-50 letters
- ✅ All letters posted by 16:00
- ✅ Zero print errors or missing data
- ✅ Batch manifest complete and saved

#### Decision Gate (17:00)

- **GO:** Batch posted successfully, proceed to tracking
- **NO-GO:** Partial batch → post what’s ready, fix issues for next week

#### Blockers & Fallbacks

- **Blocker:** Low data volume (< 20 properties)
  - **Fallback:** Expand postcode filter (e.g., add SP7, SP5) or lower price filter
- **Blocker:** Print vendor delay
  - **Fallback:** Print in-house, post Tuesday morning

---

### **Day 9 (Tuesday) — Post-Batch Review**

**Owner:** Peter + Ops Team

#### Tasks

- [ ] Confirm all letters posted (check proof of posting)
- [ ] Calculate batch metrics:
  - Total letters sent
  - Total cost (print + postage)
  - Cost per letter
- [ ] Save batch summary to `OUTPUT/direct-mail/batch-YYYY-MM-DD/summary.md`
- [ ] Brief sales/support team on response handling:
  - How to log ref codes
  - How to qualify leads
  - Response scripts

#### Success Metrics

- ✅ Batch summary documented
- ✅ Sales team trained on response process
- ✅ Monitoring plan confirmed (daily checks)

#### Decision Gate (17:00)

- **GO:** Batch complete, monitoring active
- **NO-GO:** Issues with posting → escalate and re-post

---

### **Day 10 (Wednesday) — Response Monitoring Begins**

**Owner:** Sales/Support Team

#### Tasks

- [ ] Monitor response channels:
  - Phone (log ref codes)
  - Website analytics (check QR scan events)
  - Email (check for responses)
- [ ] Log all responses to CRM/tracking sheet
- [ ] Expected: 0-2 responses (letters arrive Thu/Fri)
- [ ] Test response workflow with dummy call

#### Success Metrics

- ✅ Monitoring process working (even if no responses yet)
- ✅ Team knows how to log responses
- ✅ CRM/sheet accessible and functional

#### Decision Gate (17:00)

- **GO:** Monitoring active, proceed to Day 11
- **NO-GO:** CRM issues → use backup spreadsheet

---

### **Day 11 (Thursday) — First Responses Expected**

**Owner:** Sales/Support Team

#### Tasks

- [ ] Monitor response channels actively (letters arriving today)
- [ ] Log all responses (ref code, channel, timestamp)
- [ ] Qualify leads:
  - Genuine interest?
  - Service fit?
  - Budget awareness?
- [ ] Schedule follow-up calls/emails for qualified leads
- [ ] Update batch manifest with response data

#### Success Metrics

- ✅ At least 1 response logged (target: 2-5% response rate = 1-2 responses)
- ✅ Responses handled professionally
- ✅ Follow-ups scheduled

#### Decision Gate (17:00)

- **GO:** Responses coming in, process working
- **NO-GO:** Zero responses → review letter messaging/offer

#### Blockers & Fallbacks

- **Blocker:** Zero responses by Friday EOD
  - **Fallback:** Wait 7 days (allow for postal delays), then evaluate

---

### **Day 12 (Friday) — Mid-Sprint Review**

**Owner:** Peter + Full Team

#### Tasks

- [ ] Review batch metrics:
  - Total responses to date
  - Response rate (%)
  - Response channel breakdown
  - Lead quality
- [ ] Identify issues or improvements:
  - Letter copy too weak?
  - CTA unclear?
  - QR codes not scanning?
- [ ] Plan iteration for next batch:
  - Test alternative copy?
  - Adjust target postcodes?
  - Change offer/CTA?
- [ ] Document lessons learned in `OUTPUT/launch-sprint/lessons-day12.md`

#### Success Metrics

- ✅ Response rate >= 1% (1 in 100 letters)
- ✅ At least 1 qualified lead
- ✅ Iteration plan documented

#### Decision Gate (17:00)

- **GO:** Campaign showing promise, proceed to iteration
- **NO-GO:** Zero engagement → pivot strategy (see fallback)

#### Blockers & Fallbacks

- **Blocker:** Zero responses after 1 week
  - **Fallback:** Re-test with different letter copy, postcode, or offer
  - **Pivot option:** Switch to email/digital outreach instead

---

### **Day 13 (Monday) — Iterate: Batch 2 Planning**

**Owner:** Peter + Ops Team

#### Tasks

- [ ] Review Batch 1 results and apply learnings
- [ ] Decide: Launch Batch 2 this week or wait?
- [ ] If GO:
  - Adjust letter copy (stronger CTA, clearer value prop)
  - Test different postcode or price band
  - Plan smaller test batch (10-20 letters)
- [ ] If WAIT:
  - Continue monitoring Batch 1 responses
  - Plan deeper analysis over next week

#### Success Metrics

- ✅ Decision made: launch Batch 2 or wait
- ✅ If launching: updated template ready
- ✅ Team aligned on next steps

#### Decision Gate (17:00)

- **GO:** Batch 2 ready for Tuesday
- **WAIT:** Monitor Batch 1 for another week

---

### **Day 14 (Tuesday) — Sprint Retrospective**

**Owner:** Full Team

#### Tasks

- [ ] Hold sprint retrospective (30-60 min):
  - What went well?
  - What didn’t work?
  - What should we change?
- [ ] Document retrospective notes in `OUTPUT/launch-sprint/retrospective.md`
- [ ] Update SOPs and runbooks based on learnings
- [ ] Plan next sprint (if continuing) or pause/pivot decision
- [ ] Celebrate progress! 🎉

#### Success Metrics

- ✅ Retrospective completed
- ✅ Action items assigned for next sprint
- ✅ Team morale positive

#### Decision Gate (17:00)

- **GO:** Continue with weekly batches
- **PIVOT:** Adjust strategy based on learnings
- **PAUSE:** Gather more data before scaling

---

## Success Criteria (End of Sprint)

| Metric | Target | Stretch Goal |
|--------|--------|-------------|
| **Data pipeline operational** | Yes | Fully automated |
| **First batch posted** | 20-50 letters | 50-100 letters |
| **Response rate** | >= 1% | >= 3% |
| **Qualified leads** | >= 1 | >= 3 |
| **Tracking system working** | Yes | Real-time dashboard |
| **Team trained** | Yes | Confident & autonomous |

---

## Key Blockers & Mitigation

| Blocker | Impact | Mitigation |
|---------|--------|------------|
| **PropertyData API unavailable** | HIGH | Use backup data source or manual scraping |
| **Print vendor delay** | MEDIUM | In-house printing or backup vendor |
| **Zero responses** | MEDIUM | Iterate letter copy, test different audience |
| **Tracking system failure** | LOW | Manual phone-only tracking for first batch |
| **Legal/compliance issues** | HIGH | Conservative messaging, legal review upfront |
| **Low data volume** | MEDIUM | Expand postcode coverage or lower price filter |

---

## Escalation Path

- **Minor issue (< 2h delay):** Ops team resolves
- **Major issue (> 1 day delay):** Escalate to Peter
- **Critical blocker (sprint at risk):** Emergency team huddle + pivot decision

---

## Post-Sprint: Next Steps

1. **Week 3:** Launch weekly batch cadence (every Monday)
2. **Week 4:** Analyse response trends, optimise copy/targeting
3. **Week 5:** Scale to 100-200 letters per batch
4. **Week 6:** Introduce A/B testing (2 letter variants)
5. **Week 8:** Expand to adjacent postcodes (SP5, SP7)

---

## Resources & Contacts

- **PropertyData Support:** [support@propertydata.co.uk]
- **Print Vendor:** [vendor contact]
- **Legal/Compliance:** [legal contact]
- **Emergency Contact (Peter):** peter@onesoft.co.uk

---

## Sprint Checklist (Quick Reference)

**Week 1: Build**
- [ ] Day 1: Data pipeline tested
- [ ] Day 2: Automation scheduled
- [ ] Day 3: Letter template approved
- [ ] Day 4: Tracking system live
- [ ] Day 5: Pre-launch checklist complete

**Week 2: Launch & Iterate**
- [ ] Day 8: First batch posted! 🎉
- [ ] Day 9: Batch review complete
- [ ] Day 10: Monitoring active
- [ ] Day 11: First responses logged
- [ ] Day 12: Mid-sprint review
- [ ] Day 13: Batch 2 planned
- [ ] Day 14: Sprint retrospective

---

**Good luck, team! Let’s launch Marley Moves! 🚀**

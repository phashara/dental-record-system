import React, { useState, useEffect } from 'react'

import { Header } from './components/Header'
import { DashboardView } from './components/DashboardView'
import { TableView } from './components/TableView'
import { DoctorsView } from './components/DoctorsView'
import { LabCostSummaryView } from './components/LabCostSummaryView'

import { CameraScannerModal } from './components/CameraScannerModal'
import { RecordDetailModal } from './components/RecordDetailModal'
import { RecordFormModal } from './components/RecordFormModal'

import { GitHubAndPrivacyModal } from './components/GitHubAndPrivacyModal'
import { IPhoneLockScreen } from './components/IPhoneLockScreen'
import { DataManagementModal } from './components/DataManagementModal'

import { DentureRecord, ViewTab } from './types'
import { dentureStorage } from './lib/storage'

import {
  WifiOff,
  CheckCircle2,
  Layers,
  Users,
  DollarSign,
  Camera,
  FileText
} from 'lucide-react'

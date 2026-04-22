import { createSlice } from '@reduxjs/toolkit';
import Cookies from 'js-cookie';

const initialState = {
  staffName: Cookies.get('staffName') || '',
  isLoading: false,
  error: null,
  items: [],
  products: [],
  catalogVersion: '',
  formSubmitUrl: '',
  staffNameEntryId: null,
  totalAmountEntryId: null,
  itemCountEntryId: null,
  invoiceEmailEntryId: null,
  paymentMethodEntryId: null,
  itemsEntryId: null,
  remarksEntryId: null,
  passcode: Cookies.get('passcode') || '',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.isLoading = false;
      state.error = null;
      // Set cookie
      if (action.payload.passcode) {
        state.passcode = action.payload.passcode;
        Cookies.set('passcode', action.payload.passcode, { expires: 1 });
      }
      state.items = action.payload.items;
      state.products = action.payload.products || [];
      state.catalogVersion = action.payload.catalogVersion || '';
      state.formSubmitUrl = action.payload.formSubmitUrl;
      state.staffNameEntryId = action.payload.staffNameEntryId;
      state.totalAmountEntryId = action.payload.totalAmountEntryId;
      state.itemCountEntryId = action.payload.itemCountEntryId;
      state.invoiceEmailEntryId = action.payload.invoiceEmailEntryId;
      state.paymentMethodEntryId = action.payload.paymentMethodEntryId;
      state.itemsEntryId = action.payload.itemsEntryId;
      state.remarksEntryId = action.payload.remarksEntryId;

    },
    loginFailure: (state, action) => {
      state.isLoading = false;
      state.passcode = '';
      state.error = action.payload;
    },
    setStaffName: (state, action) => {
      state.staffName = action.payload;
      // Set cookie
      Cookies.set('staffName', action.payload, { expires: 1 });
    },
    logout: (state) => {
      state.passcode = '';
      state.staffName = '';
      state.error = null;
      // Remove cookies
      Cookies.remove('passcode');
      Cookies.remove('staffName');
    },
    clearError: (state) => {
      state.error = null;
    },
    // Initialize auth state from cookies on app start
    initializeAuth: (state) => {
      state.passcode = Cookies.get('passcode');
      state.staffName = Cookies.get('staffName') || '';
    }
  }
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  setStaffName,
  logout,
  clearError,
  initializeAuth
} = authSlice.actions;

export default authSlice.reducer;

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loginSuccess, loginFailure, clearError, loginStart } from "../store/authSlice";
import { API } from "../constant";

const LoginPage = () => {
  const [passcode, setPasscode] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { error, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Clear any existing errors when component mounts
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginStart());
    fetch(API, {
      redirect: "follow",
      method: 'POST',
      body: JSON.stringify({ passcode }),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
    })
      .then(response => response.text())
      .then(res => {
        const data = JSON.parse(res);
        console.log(data);
        if (data?.success) {
          dispatch(loginSuccess({
            passcode: passcode,
            ...data,
          }));
          navigate("/staff-name");
        } else {
          console.log(data);
          dispatch(loginFailure("Invalid passcode. Please try again."));
        }
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-dark">
      <div className="w-full max-w-sm bg-primary p-8">
        <div className="flex flex-row items-center justify-center">
          <img src="./onecircle-144.png" className="w-[80px] mb-8" />
          <h1 className="text-2xl font-bold text-center text-white mb-6">Facing GOD 2026 - POS System Login</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="passcode"
              className="block text-sm font-medium mb-1"
            >
              Passcode
            </label>
            <input
              type="password"
              id="passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              required
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 text-gray-800 transition disabled:bg-gray-100"
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm font-medium bg-red-50 border border-red-200  px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            className={`w-full btn-primary`}
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
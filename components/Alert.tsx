import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface AlertProps {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const Alert: React.FC<AlertProps> = ({ show, type, message }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
          }`}
        >
          {type === 'success' && <CheckCircle className="w-5 h-5" />}
          {type === 'error' && <XCircle className="w-5 h-5" />}
          {type === 'warning' && <AlertTriangle className="w-5 h-5" />}
          {type === 'info' && <Info className="w-5 h-5" />}
          <p>{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Alert;

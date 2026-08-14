import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserProfile, Exam, MedicalRecord, MetricEntry, Medication, Vaccine, Allergy, DailyHabits, DocumentItem } from '../types';
import { 
  initialUserProfile, 
  initialExams, 
  initialMedicalRecords, 
  initialMetrics, 
  initialMedications, 
  initialVaccines, 
  initialAllergies, 
  initialDailyHabits, 
  initialDocuments 
} from '../data/initialData';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  isFirebaseConnected: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsFirebaseConnected(true);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // First time user login -> initialize Firestore with defaults
            const newProfile: UserProfile = {
              ...initialUserProfile,
              name: user.displayName || user.email?.split('@')[0] || 'Usuário HealthAI',
              email: user.email || initialUserProfile.email,
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (error) {
          console.warn('Firestore profile sync error (using local state):', error);
          if (user.displayName || user.email) {
            setUserProfile((prev) => ({
              ...prev,
              name: user.displayName || prev.name,
              email: user.email || prev.email,
            }));
          }
        }
      } else {
        // Logged out
        setIsFirebaseConnected(false);
        setUserProfile(initialUserProfile);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          const newProfile: UserProfile = {
            ...initialUserProfile,
            name: user.displayName || 'Usuário HealthAI',
            email: user.email || '',
          };
          await setDoc(userDocRef, newProfile);
          setUserProfile(newProfile);
        }
      }
    } catch (err: unknown) {
      console.error('Google Sign In Error:', err);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: unknown) {
      console.error('Email Sign In Error:', err);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: name });
        const newProfile: UserProfile = {
          ...initialUserProfile,
          name,
          email,
        };
        const userDocRef = doc(db, 'users', cred.user.uid);
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err: unknown) {
      console.error('Email Sign Up Error:', err);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  };

  const updateUserProfile = async (partial: Partial<UserProfile>) => {
    const updated = { ...userProfile, ...partial };
    setUserProfile(updated);

    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, updated, { merge: true });
      } catch (err) {
        console.warn('Could not sync user profile update to Firestore:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateUserProfile,
        isFirebaseConnected,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

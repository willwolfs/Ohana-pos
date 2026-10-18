import React, { useState, useEffect } from 'react';
import DataTable from '../../../components/common/DataTable';
import Button from '../../../components/common/Button';
import { Plus, UserPlus, Edit2, KeyRound, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { usersService } from '../../../services/usersService';
import UserFormModal from '../components/UserFormModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeleteUserModal from '../components/DeleteUserModal';
import '../styles/Users.css';

export const UsersPage = () => {
  const { user: currentUser, updateCurrentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetPasswordUser, setTargetPasswordUser] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteUser, setTargetDeleteUser] = useState(null);

  const [feedbackMsg, setFeedbackMsg] = useState('');

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg('');
    }, 4000);
  };

  const syncCurrentUserAvatar = (list) => {
    if (!list || !list.length || !currentUser) return;
    const me = list.find(
      (u) =>
        (u.id && currentUser.id && u.id === currentUser.id) ||
        (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    if (me && me.avatar_url && me.avatar_url !== currentUser.avatar_url) {
      if (updateCurrentUser) {
        updateCurrentUser({
          avatar_url: me.avatar_url,
          name: me.name || currentUser.name,
          role: me.role || currentUser.role,
        });
      }
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await usersService.getUsers();
      if (list && list.length > 0) {
        setUsers(list);
        syncCurrentUserAvatar(list);
      } else if (currentUser) {
        setUsers([
          {
            id: currentUser.id,
            name: currentUser.name || 'Administrador',
            email: currentUser.email,
            role: currentUser.role || 'ADMIN',
            status: 'Activo',
            is_active: true,
          },
        ]);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Error cargando colaboradores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    usersService.getUsers().then((list) => {
      if (!isMounted) return;
      if (list && list.length > 0) {
        setUsers(list);
        syncCurrentUserAvatar(list);
      } else if (currentUser) {
        setUsers([
          {
            id: currentUser.id,
            name: currentUser.name || 'Administrador',
            email: currentUser.email,
            role: currentUser.role || 'ADMIN',
            status: 'Activo',
            is_active: true,
          },
        ]);
      } else {
        setUsers([]);
      }
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingUser(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (userRow) => {
    setEditingUser(userRow);
    setIsFormModalOpen(true);
  };

  const handleOpenPassword = (userRow) => {
    setTargetPasswordUser(userRow);
    setIsPasswordModalOpen(true);
  };

  const handleOpenDelete = (userRow) => {
    if (userRow.id === currentUser?.id) {
      alert('No puedes eliminar tu propia cuenta de administrador activa.');
      return;
    }
    setTargetDeleteUser(userRow);
    setIsDeleteModalOpen(true);
  };

  const handleSaveUser = async (formData, id) => {
    if (id) {
      // Editar
      const res = await usersService.updateUser(id, formData);
      if (res.success) {
        showFeedback(`Colaborador "${formData.name}" actualizado correctamente.`);
        const isSelf =
          currentUser &&
          (id === currentUser.id ||
            (formData.email &&
              currentUser.email &&
              formData.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()));
        if (isSelf && updateCurrentUser) {
          updateCurrentUser({
            name: formData.name,
            avatar_url: formData.avatar_url,
            role: formData.role,
          });
        }
        loadUsers();
      }
      return res;
    } else {
      // Crear
      const res = await usersService.createUser(formData);
      if (res.success) {
        showFeedback(`Colaborador "${formData.name}" creado con éxito.`);
        loadUsers();
      }
      return res;
    }
  };

  const handlePasswordChange = async (targetUser, newPassword) => {
    const isSelf = targetUser.id === currentUser?.id;
    const res = await usersService.changePassword({
      email: targetUser.email,
      newPassword,
      isCurrentUser: isSelf,
    });
    if (res.success) {
      showFeedback(res.message || 'Contraseña actualizada correctamente.');
    }
    return res;
  };

  const handleConfirmDelete = async (targetUser) => {
    const res = await usersService.deleteUser(targetUser.id, targetUser.email);
    if (res.success) {
      showFeedback(`Colaborador "${targetUser.name}" eliminado del sistema.`);
      loadUsers();
    }
    return res;
  };

  const getRoleBadge = (role) => {
    const r = (role || 'CASHIER').toUpperCase();
    let label = r;
    let className = 'role-cashier';

    switch (r) {
      case 'ADMIN':
        label = 'ADMINISTRADOR';
        className = 'role-admin';
        break;
      case 'CASHIER':
        label = 'CAJERO (POS)';
        className = 'role-cashier';
        break;
      case 'CHEF':
        label = 'CHEF COCINA';
        className = 'role-chef';
        break;
      case 'WAITER':
        label = 'MOZO / SALÓN';
        className = 'role-waiter';
        break;
      default:
        label = r;
        className = 'role-cashier';
    }

    return <span className={`role-badge ${className}`}>{label}</span>;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const columns = [
    {
      key: 'name',
      header: 'Nombre del Personal',
      render: (_, row) => (
        <div className="user-cell-wrapper">
          {row.avatar_url ? (
            <img
              src={row.avatar_url}
              alt={row.name}
              className="user-table-avatar"
            />
          ) : (
            <div className="user-table-avatar-fallback">
              {getInitials(row.name)}
            </div>
          )}
          <div className="user-info-text">
            <span className="user-full-name">{row.name}</span>
            {row.phone && <span className="user-meta-phone">{row.phone}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Usuario / Correo',
      render: (val) => <span style={{ color: '#334155', fontWeight: 500 }}>{val}</span>,
    },
    {
      key: 'role',
      header: 'Rol en Sistema',
      render: (val) => getRoleBadge(val),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (_, row) => {
        const isActive = row.is_active !== false && row.status !== 'Inactivo';
        return (
          <span className={`user-status-pill ${isActive ? 'active' : 'inactive'}`}>
            <span className="status-indicator-dot" />
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_, row) => (
        <div className="user-actions-cell">
          <button
            type="button"
            className="user-action-icon-btn btn-edit"
            title="Editar datos y foto"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className="user-action-icon-btn btn-pwd"
            title="Cambiar contraseña"
            onClick={() => handleOpenPassword(row)}
          >
            <KeyRound size={15} />
          </button>
          <button
            type="button"
            className="user-action-icon-btn btn-delete"
            title={row.id === currentUser?.id ? 'No puedes auto-eliminarte' : 'Eliminar colaborador'}
            onClick={() => handleOpenDelete(row)}
            disabled={row.id === currentUser?.id}
            style={row.id === currentUser?.id ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="module-page users-page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios y Roles</h1>
          <p className="page-subtitle">Control de accesos, roles y permisos de colaboradores en Ohana Makis</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
          Crear Colaborador
        </Button>
      </div>

      {feedbackMsg && (
        <div style={{
          backgroundColor: '#ecfdf5',
          color: '#065f46',
          border: '1px solid #a7f3d0',
          padding: '12px 18px',
          borderRadius: '10px',
          fontSize: '0.86rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)',
        }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Cargando colaboradores de Ohana Makis...
        </div>
      ) : users.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '3.5rem',
          textAlign: 'center',
          color: '#64748b',
        }}>
          <UserPlus size={40} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
          <h3 style={{ color: '#0f172a', marginBottom: '4px' }}>No hay colaboradores adicionales</h3>
          <p style={{ fontSize: '0.85rem' }}>Crea tu primer colaborador haciendo clic en el botón superior.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={users} />
      )}

      {/* Modal: Crear / Editar Colaborador */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveUser}
        editingUser={editingUser}
      />

      {/* Modal: Cambiar Contraseña */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        user={targetPasswordUser}
        onPasswordChange={handlePasswordChange}
      />

      {/* Modal: Confirmar Eliminación */}
      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        user={targetDeleteUser}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};

export default UsersPage;

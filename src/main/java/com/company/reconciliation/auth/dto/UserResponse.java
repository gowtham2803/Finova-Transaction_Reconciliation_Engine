package com.company.reconciliation.auth.dto;

import com.company.reconciliation.user.entity.User;

public class UserResponse {

    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String role;
    private String initials;
    private String department;
    private Boolean active;

    public UserResponse() {
    }

    public static UserResponse fromUser(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setFullName(user.getFullName() != null ? user.getFullName() : user.getUsername());
        response.setRole(user.getRole() != null ? user.getRole() : "Financial Operations Lead");
        response.setActive(user.getActive());
        response.setDepartment("South Zone Treasury");
        response.setInitials(computeInitials(response.getFullName()));
        return response;
    }

    private static String computeInitials(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "YC";
        }
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
        }
        return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getInitials() {
        return initials;
    }

    public void setInitials(String initials) {
        this.initials = initials;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
